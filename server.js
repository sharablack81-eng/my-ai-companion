
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

// Claude API setup
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_SESSION_TOKEN,
});

// Telegraf Bot setup
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const myTelegramId = process.env.MY_TELEGRAM_ID ? parseInt(process.env.MY_TELEGRAM_ID, 10) : undefined;

// Express Middleware
app.use(express.json());

// API Endpoint to proxy chat messages to Claude
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      messages: messages,
      max_tokens: 1024,
    });
    res.json(response);
  } catch (error) {
    console.error('Error proxying to Claude:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Nexus "Web Eyes" - Function to surf the web
 */
async function surfTheWeb(url) {
    const browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Take a screenshot to "see" the page
        const screenshot = await page.screenshot();
        
        // Extract text content for Claude to read
        const textContent = await page.evaluate(() => document.body.innerText.slice(0, 5000));
        
        await browser.close();
        return { screenshot, textContent };
    } catch (error) {
        await browser.close();
        throw error;
    }
}

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
    ctx.reply('Nexus is opening a browser to read that link for you...');
    const { textContent } = await surfTheWeb(url);
    const prompt = `Based on the following text from ${url}, ${query}:\n\n${textContent}`;

    const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
    });

    ctx.reply(response.content[0].text);
  } catch (error) {
    console.error('Error processing search command:', error);
    ctx.reply('Sorry, I encountered an error.');
  }
});

/**
 * Image Search Functionality
 */
bot.command('find', async (ctx) => {
    if (myTelegramId && ctx.from.id !== myTelegramId) {
        return ctx.reply('You are not authorized to use this bot.');
    }
    const query = ctx.message.text.split(' ').slice(1).join(' ');
    if (!query) return ctx.reply("What should I look for?");

    await ctx.reply(`Nexus is searching the web for: ${query}...`);

    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        // Go to DuckDuckGo Images
        await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
        await page.waitForSelector('.tile--img__img', { timeout: 10000 });
        
        // Grab the first image source
        const imageUrl = await page.evaluate(() => {
            const img = document.querySelector('.tile--img__img');
            return img ? img.src || img.getAttribute('data-src') : null;
        });

        if (imageUrl) {
            // The URL might be relative, so we need to resolve it
            const absoluteUrl = new URL(imageUrl, `https://duckduckgo.com/`).href;
            await ctx.replyWithPhoto({ url: absoluteUrl });
        } else {
            await ctx.reply("I found the results, but couldn't grab the direct image link.");
        }
    } catch (e) {
        ctx.reply("Error accessing the web: " + e.message);
    } finally {
        await browser.close();
    }
});

// Telegram Listener for Claude Brain
bot.on('text', async (ctx) => {
    if (myTelegramId && ctx.from.id !== myTelegramId) {
        return ctx.reply('You are not authorized to use this bot.');
    }
    const userInput = ctx.message.text;
    
    // Check if the user wants to "surf"
    if (userInput.startsWith('http')) {
        await ctx.reply("Nexus is opening a browser to read that link for you...");
        try {
            const { textContent } = await surfTheWeb(userInput);
            const prompt = `Please summarize the following content from the website ${userInput}:\n\n${textContent}`
            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20240620',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 512,
            });
            ctx.reply(response.content[0].text);
        } catch(error) {
            console.error("Error processing URL: ", error)
            ctx.reply("Sorry, I couldn't process that URL.")
        }
    }
});


if (process.env.TELEGRAM_BOT_TOKEN) {
    bot.launch();
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
