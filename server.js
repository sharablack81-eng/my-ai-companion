
import express from 'express';
import { Telegraf } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import playwright from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

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

// Playwright browser task function
async function runBrowserTask(url) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const content = await page.evaluate(() => document.body.innerText);
  await browser.close();
  return content;
}

// Telegraf bot command
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
    ctx.reply('Opening browser...');
    const websiteText = await runBrowserTask(url);
    const prompt = `Based on the following text from ${url}, ${query}:

${websiteText}`;

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

if (process.env.TELEGRAM_BOT_TOKEN) {
    bot.launch();
}


// Serve the index.html for any other requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
