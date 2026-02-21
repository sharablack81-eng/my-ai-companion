
import express from 'express';
import { Telegraf } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// --- Environment Variable Checks ---
if (!process.env.CLAUDE_SESSION_TOKEN) {
  console.error("FATAL: CLAUDE_SESSION_TOKEN environment variable is not set.");
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn("Warning: TELEGRAM_BOT_TOKEN is not set. Telegram bot features will be disabled.");
}

// --- API Clients ---
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_SESSION_TOKEN,
});

const bot = process.env.TELEGRAM_BOT_TOKEN ? new Telegraf(process.env.TELEGRAM_BOT_TOKEN) : null;
const myTelegramId = process.env.MY_TELEGRAM_ID ? parseInt(process.env.MY_TELEGRAM_ID, 10) : undefined;

// --- Express Middleware ---
app.use(express.json());

// --- Core API Endpoint for Chat ---
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ success: false, error: 'Messages are required' });
  }

  if (!process.env.CLAUDE_SESSION_TOKEN) {
    return res.status(500).json({ success: false, error: "This server is not configured with an AI provider." });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      messages: messages,
      max_tokens: 1024,
    });
    
    // Ensure we have content to send back
    const replyText = response.content?.[0]?.text;
    if (!replyText) {
      throw new Error("Received an empty response from the AI.");
    }

    res.status(200).json({ success: true, reply: replyText });

  } catch (error) {
    console.error('Error proxying to Claude:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred while contacting the AI.'
    });
  }
});

/**
 * Nexus "Web Eyes" - A robust function to surf the web
 */
async function surfTheWeb(url) {
    let browser;
    try {
        browser = await chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        const textContent = await page.evaluate(() => document.body.innerText.slice(0, 5000));
        
        return { textContent };
    } catch (error) {
        console.error(`Error in surfTheWeb for URL: ${url}`, error);
        // Re-throw the error to be caught by the calling function
        throw new Error(`Failed to browse the web. ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

if (bot) {
    bot.command('search', async (ctx) => {
        if (myTelegramId && ctx.from.id !== myTelegramId) {
            return ctx.reply('You are not authorized to use this bot.');
        }

      const args = ctx.message.text.split(' ');
      const url = args[1];
      const query = args.slice(2).join(' ');

      if (!url) {
        return ctx.reply('Please provide a URL.');
      }

      try {
        await ctx.reply('Nexus is opening a browser to read that link for you...');
        const { textContent } = await surfTheWeb(url);
        const prompt = `Based on the following text from ${url}, ${query}:

${textContent}`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
        });

        ctx.reply(response.content[0].text);
      } catch (error) {
        console.error('Error processing search command:', error);
        ctx.reply(`Sorry, I encountered an error: ${error.message}`);
      }
    });

    bot.command('find', async (ctx) => {
        if (myTelegramId && ctx.from.id !== myTelegramId) {
            return ctx.reply('You are not authorized to use this bot.');
        }
        const query = ctx.message.text.split(' ').slice(1).join(' ');
        if (!query) return ctx.reply("What should I look for?");

        await ctx.reply(`Nexus is searching the web for: ${query}...`);
        let browser;
        try {
            browser = await chromium.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();
            
            await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
            await page.waitForSelector('.tile--img__img', { timeout: 10000 });
            
            const imageUrl = await page.evaluate(() => {
                const img = document.querySelector('.tile--img__img');
                return img ? img.src || img.getAttribute('data-src') : null;
            });

            if (imageUrl) {
                const absoluteUrl = new URL(imageUrl, `https://duckduckgo.com/`).href;
                await ctx.replyWithPhoto({ url: absoluteUrl });
            } else {
                await ctx.reply("I found the results, but couldn't grab the direct image link.");
            }
        } catch (e) {
            ctx.reply("Error accessing the web: " + e.message);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    });
    
    bot.on('text', async (ctx) => {
        if (myTelegramId && ctx.from.id !== myTelegramId) {
            return ctx.reply('You are not authorized to use this bot.');
        }
        const userInput = ctx.message.text;
        
        if (userInput.startsWith('http')) {
            await ctx.reply("Nexus is opening a browser to read that link for you...");
            try {
                const { textContent } = await surfTheWeb(userInput);
                const prompt = `Please summarize the following content from the website ${userInput}:

${textContent}`
                const response = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20240620',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 512,
                });
                ctx.reply(response.content[0].text);
            } catch(error) {
                console.error("Error processing URL: ", error);
                ctx.reply(`Sorry, I couldn't process that URL: ${error.message}`);
            }
        }
    });

    bot.launch();
    console.log("Telegram bot launched.");
}

// --- Static File Serving ---
const frontendDistPath = path.resolve(__dirname, 'dist');
console.log(`[Server] Resolved frontend build path: ${frontendDistPath}`);

if (fs.existsSync(frontendDistPath)) {
  console.log('[Server] Frontend build found. Serving static files.');
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn('[Server] Frontend build not found. Running in backend-only mode.');
  app.get('/', (req, res) => {
    res.send('Server is running, but the frontend build was not found.');
  });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
