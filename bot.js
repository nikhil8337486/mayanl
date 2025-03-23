const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Bot configuration
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Replace with your actual bot token
const ADMIN_USERNAME = 'ADMIN'; // Admin username for purchases

// Initialize the bot
const bot = new Telegraf(BOT_TOKEN);

// Database path for storing user data
const DB_PATH = path.join(__dirname, 'users_db.json');

// Load user database or create a new one if it doesn't exist
let users = {};
try {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    users = JSON.parse(data);
  }
} catch (error) {
  console.error('Error loading user database:', error);
}

// Save user database
const saveUsers = () => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving user database:', error);
  }
};

// Reset daily search count at midnight
const resetDailySearches = () => {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const timeUntilMidnight = midnight - now;

  setTimeout(() => {
    console.log('Resetting daily search counts...');
    for (const userId in users) {
      users[userId].dailySearches = 0;
    }
    saveUsers();
    resetDailySearches(); // Schedule the next reset
  }, timeUntilMidnight);
};

// Start the daily reset schedule
resetDailySearches();

// Check if a user exists in the database, create if not
const ensureUser = (userId) => {
  if (!users[userId]) {
    users[userId] = {
      userId,
      dailySearches: 0,
      unlimitedAccess: false,
      lastSearchDate: null
    };
    saveUsers();
  }
  
  // Reset daily searches if it's a new day
  const today = new Date().toDateString();
  if (users[userId].lastSearchDate !== today) {
    users[userId].dailySearches = 0;
    users[userId].lastSearchDate = today;
    saveUsers();
  }
  
  return users[userId];
};

// Bot start command
bot.start((ctx) => {
  const userId = ctx.from.id.toString();
  ensureUser(userId);
  
  ctx.reply(
    `🚗 *Welcome to Vehicle Info Bot* 🚗\n\n` +
    `I can help you get details of any vehicle using its registration number.\n\n` +
    `*Features:*\n` +
    `• 1 free search per day\n` +
    `• Contact @${ADMIN_USERNAME} for unlimited access\n\n` +
    `To begin, just send me a vehicle registration number.`,
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    `*Vehicle Info Bot - Help*\n\n` +
    `*Commands:*\n` +
    `/start - Start the bot\n` +
    `/help - Show this help message\n` +
    `/status - Check your search limit status\n\n` +
    `*How to use:*\n` +
    `Simply send a vehicle registration number (like DL1ABC1234) to get vehicle details.\n\n` +
    `*Limits:*\n` +
    `• Free users: 1 search per day\n` +
    `• For unlimited access, contact @${ADMIN_USERNAME}`,
    { parse_mode: 'Markdown' }
  );
});

// Status command - Check user's search limits
bot.command('status', (ctx) => {
  const userId = ctx.from.id.toString();
  const user = ensureUser(userId);
  
  if (user.unlimitedAccess) {
    ctx.reply(
      `✅ *You have unlimited access!*\n\nYou can perform unlimited vehicle searches.`,
      { parse_mode: 'Markdown' }
    );
  } else {
    const remainingSearches = Math.max(0, 1 - user.dailySearches);
    ctx.reply(
      `*Your Search Limit Status*\n\n` +
      `• Free searches remaining today: *${remainingSearches}*\n` +
      `• Account type: *Free*\n\n` +
      `Want unlimited searches? Contact @${ADMIN_USERNAME} to upgrade!`,
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.url('Contact Admin for Unlimited Access', `https://t.me/${ADMIN_USERNAME}`)
        ])
      }
    );
  }
});

// Admin command to grant unlimited access (only for the admin)
bot.command('grant', async (ctx) => {
  // Check if the command is from the admin
  if (ctx.from.username !== ADMIN_USERNAME) {
    return ctx.reply('⚠️ Only admin can use this command.');
  }
  
  const args = ctx.message.text.split(' ');
  if (args.length < 2) {
    return ctx.reply('Usage: /grant <user_id>');
  }
  
  const targetUserId = args[1];
  ensureUser(targetUserId);
  users[targetUserId].unlimitedAccess = true;
  saveUsers();
  
  ctx.reply(`✅ Unlimited access granted to user ${targetUserId}`);
  
  // Notify the user
  try {
    await bot.telegram.sendMessage(
      targetUserId,
      `🎉 *Congratulations!* 🎉\n\nYou've been granted unlimited access to Vehicle Info Bot. You can now perform unlimited searches.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.reply(`Could not notify user: ${error.message}`);
  }
});

// Format vehicle data for better display
const formatVehicleData = (data) => {
  const response = data.response;
  
  return `🚗 *Vehicle Information* 🚗\n\n` +
    `*Registration Number:* ${response.regNo}\n` +
    `*Registration Authority:* ${response.regAuthority}\n` +
    `*Registration Date:* ${response.regDate}\n\n` +
    
    `📋 *Vehicle Details*\n` +
    `*Make:* ${response.manufacturer}\n` +
    `*Model:* ${response.vehicle}\n` +
    `*Variant:* ${response.variant || 'N/A'}\n` +
    `*Vehicle Class:* ${response.vehicleClass}\n` +
    `*Fuel Type:* ${response.fuelType}\n` +
    `*Engine:* ${response.engine}\n` +
    `*Chassis:* ${response.chassis}\n` +
    `*CC:* ${response.cubicCapacity}\n` +
    `*Seating Capacity:* ${response.seatCapacity}\n\n` +
    
    `👤 *Owner Details*\n` +
    `*Owner:* ${response.owner}\n` +
    `*Father's Name:* ${response.ownerFatherName || 'N/A'}\n` +
    `*Address:* ${response.presentAddress}\n\n` +
    
    `📝 *Insurance Details*\n` +
    `*Insurance Company:* ${response.insuranceCompanyName || 'N/A'}\n` +
    `*Policy Number:* ${response.insurancePolicyNumber || 'N/A'}\n` +
    `*Valid Until:* ${response.insuranceUpto || 'N/A'}\n` +
    `*Status:* ${response.insuranceExpired ? '❌ Expired' : '✅ Active'}\n\n` +
    
    `🔄 *Other Information*\n` +
    `*PUCC Valid Until:* ${response.puccValidUpto || 'N/A'}\n` +
    `*Financier:* ${response.financerName || 'N/A'}\n\n` +
    
    `ℹ️ _Data retrieved on ${new Date().toLocaleString()}_`;
};

// Handle registration number input
bot.on('text', async (ctx) => {
  const input = ctx.message.text.trim().toUpperCase();
  
  // Skip command processing
  if (input.startsWith('/')) return;
  
  // Simple validation for Indian vehicle registration number format
  const regexPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;
  if (!regexPattern.test(input)) {
    return ctx.reply(
      '⚠️ Invalid vehicle registration number format.\n\n' +
      'Please enter a valid format like DL01AB1234, MH02CD5678, etc.'
    );
  }
  
  const userId = ctx.from.id.toString();
  const user = ensureUser(userId);
  
  // Check if the user has unlimited access or has searches remaining
  if (!user.unlimitedAccess && user.dailySearches >= 1) {
    return ctx.reply(
      '⚠️ *Daily search limit reached!*\n\n' +
      'You have used your free search for today.\n\n' +
      'Options:\n' +
      '• Wait until tomorrow for another free search\n' +
      '• Contact @' + ADMIN_USERNAME + ' for unlimited access',
      { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.url('Get Unlimited Access', `https://t.me/${ADMIN_USERNAME}`)
        ])
      }
    );
  }
  
  // Show typing indicator
  ctx.replyWithChatAction('typing');
  
  try {
    // Notify the user that we're processing
    const loadingMessage = await ctx.reply('🔍 Searching for vehicle details...');
    
    // Call the API to get vehicle details
    const apiUrl = `https://nikhilraghav.site/api/api-proxy.php?numberPlate=${encodeURIComponent(input)}`;
    const response = await axios.get(apiUrl);
    
    // Delete the loading message
    await bot.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
    
    // Handle API response
    if (response.data.statusCode === 200 && response.data.response) {
      // Update user's search count if they don't have unlimited access
      if (!user.unlimitedAccess) {
        user.dailySearches += 1;
        saveUsers();
      }
      
      // Format and send the vehicle data
      const formattedData = formatVehicleData(response.data);
      await ctx.reply(formattedData, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📊 View More Details', 'more_details')],
          [Markup.button.callback('🔍 Search Another Vehicle', 'new_search')]
        ])
      });
      
      // Show remaining searches info if not unlimited
      if (!user.unlimitedAccess) {
        const remainingSearches = Math.max(0, 1 - user.dailySearches);
        ctx.reply(
          `ℹ️ You have *${remainingSearches} free searches* remaining today.\n\n` +
          `Want unlimited searches? Contact @${ADMIN_USERNAME}`,
          { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              Markup.button.url('Get Unlimited Access', `https://t.me/${ADMIN_USERNAME}`)
            ])
          }
        );
      }
    } else {
      // Handle error response
      ctx.reply(
        '❌ *Error fetching vehicle details*\n\n' +
        `Message: ${response.data.message || 'Unknown error'}\n\n` +
        'Please check the registration number and try again.',
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    ctx.reply(
      '❌ *Service Error*\n\n' +
      'Unable to fetch vehicle details at the moment. Please try again later.\n\n' +
      `Error details: ${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Handle callback queries for inline buttons
bot.action('more_details', (ctx) => {
  ctx.answerCbQuery('Detailed view is not available in the current version.');
  ctx.reply(
    '🔜 *Coming Soon!*\n\n' +
    'Detailed vehicle history and additional information will be available in the upcoming update.\n\n' +
    'Stay tuned!',
    { parse_mode: 'Markdown' }
  );
});

bot.action('new_search', (ctx) => {
  ctx.answerCbQuery('');
  ctx.reply(
    '🔍 *Ready for a new search!*\n\n' +
    'Please enter the vehicle registration number you want to check.',
    { parse_mode: 'Markdown' }
  );
});

// Handle errors
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred. Please try again later.');
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('Vehicle Info Bot is running!');
  })
  .catch(err => {
    console.error('Failed to start bot:', err);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
