import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Support up to 30MB JSON for image payloads
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Screenshot Trade Parser API
app.post('/api/parse-trade-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' });
    }

    // Clean base64 header if present (e.g. "data:image/png;base64,....")
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        fallbackRequired: true,
        message: 'GEMINI_API_KEY is not set on server; falling back to local vision parser.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a financial options trading OCR expert for Indian (NSE/NIFTY) and Global derivative brokers (Zerodha Kite, Groww, AngelOne, Upstox, Dhan, Sensibull, Interactive Brokers, Robinhood).
Analyze this broker trade book, position book, or order history screenshot.
Extract every option or futures trade position shown.

For each trade leg, extract:
- instrument: Underlying symbol (e.g., NIFTY, BANKNIFTY, FINNIFTY, TCS, RELIANCE, SPY, QQQ). Default to "NIFTY" if ambiguous.
- optionType: "CALL" (or "CE"), "PUT" (or "PE"), or "FUTURE" (or "FUT").
- strikePrice: Numerical strike price (e.g., 25000, 52000, 3500). If FUTURE, use 0 or current spot.
- action: "BUY" or "SELL" (Long or Short).
- quantity: Total units/quantity (e.g., 50, 100, 75).
- lots: Number of lots (if lot size is known, or infer from quantity).
- lotSize: Lot size (e.g., 50 for NIFTY, 15 or 30 for BANKNIFTY, 65 for FINNIFTY).
- entryPrice: Premium/trade execution price per unit (e.g., 145.50, 82.20).
- expiryDate: Expiry date string in YYYY-MM-DD format (if visible or infer nearest weekly Thursday).

Also extract overall context if visible:
- detectedSpotPrice: Underlying current spot price if visible in the screenshot (number or null).
- brokerName: Broker name if recognizable (e.g., "Zerodha", "Groww", "AngelOne", "Sensibull", "Dhan", "Upstox").

Return strictly JSON matching this structure.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brokerName: { type: Type.STRING },
            instrument: { type: Type.STRING },
            detectedSpotPrice: { type: Type.NUMBER },
            trades: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instrument: { type: Type.STRING },
                  action: { type: Type.STRING, enum: ['BUY', 'SELL'] },
                  optionType: { type: Type.STRING, enum: ['CALL', 'PUT', 'CE', 'PE', 'FUTURE', 'FUT'] },
                  strikePrice: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  lots: { type: Type.NUMBER },
                  lotSize: { type: Type.NUMBER },
                  entryPrice: { type: Type.NUMBER },
                  expiryDate: { type: Type.STRING }
                },
                required: ['action', 'optionType', 'strikePrice', 'entryPrice']
              }
            }
          },
          required: ['trades']
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.status(200).json({
      success: true,
      data: parsedJson
    });
  } catch (error: any) {
    console.error('Gemini screenshot parse error:', error);
    return res.status(200).json({
      success: false,
      fallbackRequired: true,
      error: error?.message || 'Vision model processing failed, fallback will be used.'
    });
  }
});

// AI Options Trading Mentor Chat API
app.post('/api/ai-mentor/chat', async (req, res) => {
  try {
    const { message, history = [], strategyContext = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const {
      symbol = 'NIFTY',
      spotPrice = 25030,
      legs = [],
      maxProfit = 'Unlimited',
      maxLoss = 'Unlimited',
      breakevens = [],
      pop = 50,
      netDelta = 0,
      netTheta = 0,
      netVega = 0
    } = strategyContext;

    const legsDescription = legs.length > 0
      ? legs.map((l: any) => `  * ${l.action} ${l.lots || 1} Lots of ${symbol} ${l.strike} ${l.type} @ ₹${l.entryPrice} (Expiry: ${l.expiry})`).join('\n')
      : '  No active legs added yet (empty strategy).';

    const contextString = `[Strategy Context]
- Instrument: ${symbol} (Spot: ₹${spotPrice})
- Active Position Legs (${legs.length}):
${legsDescription}
- Max Profit: ${typeof maxProfit === 'number' ? `₹${Math.round(maxProfit).toLocaleString()}` : maxProfit}
- Max Loss: ${typeof maxLoss === 'number' ? `₹${Math.round(maxLoss).toLocaleString()}` : maxLoss}
- Breakeven Spot(s): ${breakevens.length > 0 ? breakevens.join(', ') : 'None'}
- Probability of Profit (POP): ${pop}%
- Portfolio Greeks: Delta=${netDelta}, Theta=₹${netTheta}/day, Vega=₹${netVega}/%IV`;

    const systemInstruction = `You are an expert options trading mentor. The user is currently looking at this strategy:
${contextString}

Answer their questions about this strategy, suggest adjustments if the market moves, and explain Greeks in simple Hindi/English (Hinglish like: "Theta aapka friend hai kyunki time decay se premium ghirega", "Agar Nifty 200 point upar move kare toh upper leg roll kar sakte hain"). 
Be concise, clear, and actionable. Use bullet points and bold text for clarity.`;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Fallback mentor response if API key is not present
      const fallbackReply = generateFallbackMentorResponse(message, strategyContext);
      return res.status(200).json({
        reply: fallbackReply,
        source: 'local-mentor-rule'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Format multi-turn conversation history for generateContent
    const formattedContents: any[] = [];
    
    // Add past turns (limit last 6 messages to stay fast and focused)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      if (h.role === 'user' || h.role === 'model') {
        formattedContents.push({
          role: h.role,
          parts: [{ text: h.text || h.parts?.[0]?.text || '' }]
        });
      }
    }

    // Append current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 7000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const reply = response.text || 'I could not generate an answer right now. Please try asking again.';

    return res.status(200).json({
      reply,
      source: 'gemini-3.8-flash'
    });
  } catch (error: any) {
    console.error('AI Mentor chat error:', error);
    // Provide a graceful fallback answer rather than hard-failing
    const fallback = generateFallbackMentorResponse(req.body?.message || '', req.body?.strategyContext || {});
    return res.status(200).json({
      reply: fallback,
      source: 'fallback-on-error',
      note: 'Processed via offline rules due to network timeout'
    });
  }
});

// Helper for offline / fallback mentor responses
function generateFallbackMentorResponse(query: string, ctx: any): string {
  const q = query.toLowerCase();
  const symbol = ctx.symbol || 'NIFTY';
  const legsCount = ctx.legs?.length || 0;
  const spot = ctx.spotPrice || 25030;

  if (q.includes('theta') || q.includes('time decay')) {
    return `⏳ **Theta (Time Decay) Explanation:**
- **Kya hai:** Theta batata hai ki har din guzarne par aapke option premium ki kitni value kam hogi (time decay).
- **Aapki Strategy:** Net Theta is **₹${ctx.netTheta || 0}/day**.
- **Rule of thumb:** Agar aap option seller hain (Credit spread / Straddle), Theta aapka dost hai—roz time decay se profit banta hai. Agar option buyer hain, time aapke against kaam karta hai.`;
  }

  if (q.includes('delta') || q.includes('move')) {
    return `📈 **Delta Explanation:**
- **Kya hai:** Delta batata hai ki underlying index (${symbol}) ke ₹1 move hone par aapki strategy ka P&L kitna change hoga.
- **Aapki Strategy:** Net Delta is **${ctx.netDelta || 0}**.
- **Interpretation:** Positive Delta = Bullish setup, Negative Delta = Bearish setup, Delta near 0 = Delta Neutral (market chahe thoda upar jaye ya neeche, P&L stable rahega).`;
  }

  if (q.includes('adjust') || q.includes('risk') || q.includes('stop loss')) {
    return `🛡️ **Strategy Adjustments & Risk Management:**
- **Current Position:** ${symbol} @ ₹${spot} (${legsCount} active legs).
- **Max Profit:** ${ctx.maxProfit || 'Unlimited'}, **Max Loss:** ${ctx.maxLoss || 'Unlimited'}.
- **Breakeven Range:** ${ctx.breakevens?.length > 0 ? ctx.breakevens.join(' to ') : 'No defined boundaries'}.
- **Adjustment Rule:** Agar spot price breakeven ke 30-40% paas aaye, untested side ko roll karke narrow spread banayein ya fir protective OTM hedge buy karein.`;
  }

  return `📊 **Strategy Overview (${symbol} @ ₹${spot}):**
- **Structure:** ${legsCount > 0 ? `${legsCount}-leg structure configured` : 'No trades added yet'}.
- **Probability of Profit (POP):** ${ctx.pop || 50}%.
- **Key Tip:** Hamesha apne Max Loss ko account size ke 2-3% se zyada na hone dein. Agar market sideways rahe, toh Theta decay ka benefit milega. Aap adjustment ya kisi specific Greek (Delta, Gamma, Vega) ke baare mein bhi pooch sakte hain!`;
}

// Mount Vite or serve static assets
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TradeLab Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
