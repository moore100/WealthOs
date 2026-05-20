//+------------------------------------------------------------------+
//|                                            AIAdvisorBridge.mq5   |
//|  WealthOS - MetaTrader 5 TCP Bridge for AI Financial Advisor     |
//+------------------------------------------------------------------+
#property copyright "WealthOS"
#property link      "https://wealthos.app"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//--- Input Parameters
input string   ServerIP      = "127.0.0.1";
input int      DataPort       = 9000;
input int      CommandPort    = 9001;
input int      TimerInterval  = 1;

//--- Socket handles
int dataSocket    = INVALID_HANDLE;
int commandSocket = INVALID_HANDLE;
int clientSocket  = INVALID_HANDLE;

//--- Trade object
CTrade m_trade;

//--- Buffer for incoming commands
string cmdBuffer = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Initialize trade object
   m_trade.SetExpertMagicNumber(0);
   m_trade.SetDeviationInPoints(10);
   m_trade.SetTypeFilling(ORDER_FILLING_IOC);
   m_trade.SetAsyncMode(false);

   // Create data socket (sends tick/account/positions to Electron)
   dataSocket = SocketCreate();
   if(dataSocket == INVALID_HANDLE)
     {
      Print("[AIAdvisorBridge] ERROR: Failed to create data socket");
      return(INIT_FAILED);
     }

   if(!SocketBind(dataSocket, ServerIP, DataPort))
     {
      Print("[AIAdvisorBridge] ERROR: Failed to bind data socket to ", ServerIP, ":", DataPort);
      SocketClose(dataSocket);
      dataSocket = INVALID_HANDLE;
      return(INIT_FAILED);
     }

   if(!SocketListen(dataSocket, 1))
     {
      Print("[AIAdvisorBridge] ERROR: Failed to listen on data socket");
      SocketClose(dataSocket);
      dataSocket = INVALID_HANDLE;
      return(INIT_FAILED);
     }

   Print("[AIAdvisorBridge] Data socket listening on ", ServerIP, ":", DataPort);

   // Create command socket (receives orders from Electron)
   commandSocket = SocketCreate();
   if(commandSocket == INVALID_HANDLE)
     {
      Print("[AIAdvisorBridge] ERROR: Failed to create command socket");
      return(INIT_FAILED);
     }

   if(!SocketBind(commandSocket, ServerIP, CommandPort))
     {
      Print("[AIAdvisorBridge] ERROR: Failed to bind command socket to ", ServerIP, ":", CommandPort);
      SocketClose(commandSocket);
      commandSocket = INVALID_HANDLE;
      return(INIT_FAILED);
     }

   if(!SocketListen(commandSocket, 1))
     {
      Print("[AIAdvisorBridge] ERROR: Failed to listen on command socket");
      SocketClose(commandSocket);
      commandSocket = INVALID_HANDLE;
      return(INIT_FAILED);
     }

   Print("[AIAdvisorBridge] Command socket listening on ", ServerIP, ":", CommandPort);

   // Start timer for periodic data push
   EventSetTimer(TimerInterval);

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();

   if(clientSocket != INVALID_HANDLE)
     {
      SocketClose(clientSocket);
      clientSocket = INVALID_HANDLE;
     }

   if(dataSocket != INVALID_HANDLE)
     {
      SocketClose(dataSocket);
      dataSocket = INVALID_HANDLE;
     }

   if(commandSocket != INVALID_HANDLE)
     {
      SocketClose(commandSocket);
      commandSocket = INVALID_HANDLE;
     }

   Print("[AIAdvisorBridge] Stopped. Reason: ", reason);
  }

//+------------------------------------------------------------------+
//| Timer handler for periodic data push                               |
//+------------------------------------------------------------------+
void OnTimer()
  {
   // Accept new client on data socket if none connected
   if(clientSocket == INVALID_HANDLE && dataSocket != INVALID_HANDLE)
     {
      clientSocket = SocketAccept(dataSocket);
      if(clientSocket != INVALID_HANDLE)
        {
         Print("[AIAdvisorBridge] Client connected to data socket");
        }
     }

   // Accept command connections and process them
   if(commandSocket != INVALID_HANDLE)
     {
      int cmdClient = SocketAccept(commandSocket);
      if(cmdClient != INVALID_HANDLE)
        {
         // Read incoming command data
         uchar buf[];
         int read = SocketRead(cmdClient, buf, 4096, 100);
         if(read > 0)
           {
            string incoming = CharArrayToString(buf, 0, read, CP_UTF8);
            ProcessCommands(incoming);
           }
         SocketClose(cmdClient);
        }
     }

   // Push account and positions data (tick is handled in OnTick)
   SendAccountData();
   SendPositionsData();
  }

//+------------------------------------------------------------------+
//| Tick event handler                                                 |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Accept new client if needed
   if(clientSocket == INVALID_HANDLE && dataSocket != INVALID_HANDLE)
     {
      clientSocket = SocketAccept(dataSocket);
      if(clientSocket != INVALID_HANDLE)
        {
         Print("[AIAdvisorBridge] Client connected to data socket");
        }
     }

   // Send tick data if client connected
   if(clientSocket != INVALID_HANDLE)
     {
      SendTickData();
     }

   // Process any pending commands on command socket (non-blocking)
   if(commandSocket != INVALID_HANDLE)
     {
      int cmdClient = SocketAccept(commandSocket);
      if(cmdClient != INVALID_HANDLE)
        {
         uchar buf[];
         int read = SocketRead(cmdClient, buf, 4096, 100);
         if(read > 0)
           {
            string incoming = CharArrayToString(buf, 0, read, CP_UTF8);
            ProcessCommands(incoming);
           }
         SocketClose(cmdClient);
        }
     }
  }

//+------------------------------------------------------------------+
//| Send tick data                                                     |
//+------------------------------------------------------------------+
void SendTickData()
  {
   string json = "{\"type\":\"tick\",\"symbol\":\"" + _Symbol + "\","
                + "\"bid\":" + DoubleToString(SymbolInfoDouble(_Symbol, SYMBOL_BID), _Digits) + ","
                + "\"ask\":" + DoubleToString(SymbolInfoDouble(_Symbol, SYMBOL_ASK), _Digits) + ","
                + "\"spread\":" + IntegerToString((int)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD)) + ","
                + "\"time\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"}\n";

   SendToClient(json);
  }

//+------------------------------------------------------------------+
//| Send positions data                                                |
//+------------------------------------------------------------------+
void SendPositionsData()
  {
   int total = PositionsTotal();
   string positions = "[";

   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;

      if(i > 0) positions += ",";

      string typeStr = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "buy" : "sell";

      positions += "{"
                 + "\"ticket\":" + IntegerToString((long)ticket) + ","
                 + "\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\","
                 + "\"type\":\"" + typeStr + "\","
                 + "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ","
                 + "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), _Digits) + ","
                 + "\"currentPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), _Digits) + ","
                 + "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ","
                 + "\"swap\":" + DoubleToString(PositionGetDouble(POSITION_SWAP), 2) + ","
                 + "\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), _Digits) + ","
                 + "\"tp\":" + DoubleToString(PositionGetDouble(POSITION_TP), _Digits)
                 + "}";
     }

   positions += "]";

   string json = "{\"type\":\"positions\",\"data\":" + positions + "}\n";
   SendToClient(json);
  }

//+------------------------------------------------------------------+
//| Send account data                                                  |
//+------------------------------------------------------------------+
void SendAccountData()
  {
   string json = "{\"type\":\"account\","
                + "\"login\":" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN)) + ","
                + "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\","
                + "\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) + "\","
                + "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ","
                + "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ","
                + "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ","
                + "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2) + ","
                + "\"marginLevel\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_LEVEL), 2) + ","
                + "\"profit\":" + DoubleToString(AccountInfoDouble(ACCOUNT_PROFIT), 2)
                + "}\n";

   SendToClient(json);
  }

//+------------------------------------------------------------------+
//| Send string to connected client                                    |
//+------------------------------------------------------------------+
void SendToClient(const string &data)
  {
   if(clientSocket == INVALID_HANDLE) return;

   uchar bytes[];
   StringToCharArray(data, bytes, 0, StringLen(data), CP_UTF8);

   int sent = SocketSend(clientSocket, bytes, ArraySize(bytes));
   if(sent <= 0)
     {
      // Client disconnected
      SocketClose(clientSocket);
      clientSocket = INVALID_HANDLE;
      Print("[AIAdvisorBridge] Client disconnected");
     }
  }

//+------------------------------------------------------------------+
//| Process incoming commands from Electron app                        |
//+------------------------------------------------------------------+
void ProcessCommands(const string &incoming)
  {
   cmdBuffer += incoming;

   // Split by newline (each line = one JSON command)
   string lines[];
   int lineCount = StringSplit(cmdBuffer, '\n', lines);

   // Process all complete lines
   for(int i = 0; i < lineCount - 1; i++)
     {
      if(StringLen(lines[i]) == 0) continue;
      ExecuteCommand(lines[i]);
     }

   // Keep incomplete data in buffer
   if(lineCount > 0)
     {
      int lastIdx = lineCount - 1;
      if(StringFind(cmdBuffer, "\n", StringLen(cmdBuffer) - 1) < 0)
        cmdBuffer = lines[lastIdx];
      else
        cmdBuffer = "";
     }
  }

//+------------------------------------------------------------------+
//| Execute a single JSON command                                      |
//+------------------------------------------------------------------+
void ExecuteCommand(const string &jsonCmd)
  {
   // Simple JSON parsing — extract action field
   string action = ExtractJsonField(jsonCmd, "action");

   if(action == "buy")
     {
      string symbol   = ExtractJsonField(jsonCmd, "symbol");
      double volume   = ExtractJsonDouble(jsonCmd, "volume");
      double sl       = ExtractJsonDouble(jsonCmd, "sl");
      double tp       = ExtractJsonDouble(jsonCmd, "tp");
      if(volume <= 0) volume = 0.1;
      if(StringLen(symbol) == 0) symbol = _Symbol;

      bool result = m_trade.Buy(volume, symbol, 0, sl, tp, "AIAdvisorBridge");
      SendAck(result, m_trade.ResultOrder(), m_trade.ResultRetcodeDescription());
     }
   else if(action == "sell")
     {
      string symbol   = ExtractJsonField(jsonCmd, "symbol");
      double volume   = ExtractJsonDouble(jsonCmd, "volume");
      double sl       = ExtractJsonDouble(jsonCmd, "sl");
      double tp       = ExtractJsonDouble(jsonCmd, "tp");
      if(volume <= 0) volume = 0.1;
      if(StringLen(symbol) == 0) symbol = _Symbol;

      bool result = m_trade.Sell(volume, symbol, 0, sl, tp, "AIAdvisorBridge");
      SendAck(result, m_trade.ResultOrder(), m_trade.ResultRetcodeDescription());
     }
   else if(action == "close")
     {
      ulong ticket = (ulong)ExtractJsonLong(jsonCmd, "ticket");
      if(ticket > 0)
        {
         bool result = m_trade.PositionClose(ticket);
         SendAck(result, ticket, m_trade.ResultRetcodeDescription());
        }
      else
        {
         // Close all positions on symbol if no ticket given
         string symbol = ExtractJsonField(jsonCmd, "symbol");
         if(StringLen(symbol) > 0)
           {
            bool result = m_trade.PositionClosePartial(symbol, 0);
            SendAck(result, 0, m_trade.ResultRetcodeDescription());
           }
         else
           {
            SendAck(false, 0, "No ticket or symbol specified");
           }
        }
     }
   else if(action == "closeAll")
     {
      bool result = true;
      string msg = "All positions closed";
      while(PositionsTotal() > 0)
        {
         ulong ticket = PositionGetTicket(0);
         if(!m_trade.PositionClose(ticket))
           {
            result = false;
            msg = m_trade.ResultRetcodeDescription();
            break;
           }
        }
      SendAck(result, 0, msg);
     }
   else if(action == "modify")
     {
      ulong ticket = (ulong)ExtractJsonLong(jsonCmd, "ticket");
      double sl    = ExtractJsonDouble(jsonCmd, "sl");
      double tp    = ExtractJsonDouble(jsonCmd, "tp");
      if(ticket > 0)
        {
         bool result = m_trade.PositionModify(ticket, sl, tp);
         SendAck(result, ticket, m_trade.ResultRetcodeDescription());
        }
      else
        {
         SendAck(false, 0, "No ticket specified");
        }
     }
   else
     {
      SendAck(false, 0, "Unknown action: " + action);
     }
  }

//+------------------------------------------------------------------+
//| Send acknowledgement to command client                             |
//+------------------------------------------------------------------+
void SendAck(bool success, ulong ticket, const string &message)
  {
   string status = success ? "ok" : "error";
   string json = "{\"type\":\"ack\",\"status\":\"" + status + "\","
                + "\"ticket\":" + IntegerToString((long)ticket) + ","
                + "\"message\":\"" + EscapeJson(message) + "\"}\n";

   // Send ack on the data socket since command socket is closed after each request
   SendToClient(json);
  }

//+------------------------------------------------------------------+
//| Simple JSON field extractors                                       |
//+------------------------------------------------------------------+
string ExtractJsonField(const string &json, const string &field)
  {
   string key = "\"" + field + "\"";
   int pos = StringFind(json, key);
   if(pos < 0) return "";

   int colon = StringFind(json, ":", pos);
   if(colon < 0) return "";

   int quoteStart = StringFind(json, "\"", colon);
   if(quoteStart < 0)
     {
      // Try number value
      string sub = StringSubstr(json, colon + 1);
      sub = StringLower(sub);
      if(StringFind(sub, "true") == 0) return "true";
      if(StringFind(sub, "false") == 0) return "false";
      return "";
     }

   int quoteEnd = StringFind(json, "\"", quoteStart + 1);
   if(quoteEnd < 0) return "";

   return StringSubstr(json, quoteStart + 1, quoteEnd - quoteStart - 1);
  }

//+------------------------------------------------------------------+
//| Extract double from JSON                                           |
//+------------------------------------------------------------------+
double ExtractJsonDouble(const string &json, const string &field)
  {
   string val = ExtractJsonField(json, field);
   if(StringLen(val) == 0) return 0.0;
   return StringToDouble(val);
  }

//+------------------------------------------------------------------+
//| Extract long from JSON                                             |
//+------------------------------------------------------------------+
long ExtractJsonLong(const string &json, const string &field)
  {
   string val = ExtractJsonField(json, field);
   if(StringLen(val) == 0) return 0;
   return StringToInteger(val);
  }

//+------------------------------------------------------------------+
//| Escape JSON string                                                 |
//+------------------------------------------------------------------+
string EscapeJson(const string &input)
  {
   string result = input;
   StringReplace(result, "\\", "\\\\");
   StringReplace(result, "\"", "\\\"");
   StringReplace(result, "\n", "\\n");
   StringReplace(result, "\r", "\\r");
   return result;
  }
//+------------------------------------------------------------------+
