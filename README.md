# Vehicle Info Bot

A Telegram bot that fetches vehicle details using a car registration number. It provides 1 free search per day for users, with an option for unlimited access via a premium subscription.

## Features
- **Limited Free Search**: 1 free search per day for each user.
- **Premium Access**: Contact @ADMIN for unlimited searches.
- **User-Friendly UI**: Uses inline buttons and Markdown formatting for a clean interface.
- **Database Persistence**: Stores user data (search limits, premium status) using Keyv with PostgreSQL (on Railway) or SQLite (locally).

## Tech Stack
- **Node.js**: Backend runtime.
- **Telegraf**: Telegram bot framework.
- **Keyv**: For database storage (supports SQLite and PostgreSQL).
- **Axios**: For making API requests to fetch vehicle details.
- **Railway**: Hosting platform with PostgreSQL database.

## Setup Instructions

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/nikhil833748/mayani.git
   cd mayani
