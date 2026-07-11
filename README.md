# 🏋️ Fitness Buddy — AI-Powered Personal Fitness Coach

> Built with **IBM Granite** models via **IBM watsonx.ai Studio** · Flask · Bootstrap 5

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat Coach** | Conversational fitness coach powered by IBM Granite |
| 👤 **User Profile** | Age, gender, height, weight, fitness level, diet, goals |
| 🏋️ **Workout Plans** | AI-generated home workouts (bodyweight, HIIT, Yoga) |
| 🥗 **Indian Meal Plans** | Personalized meal plans with Indian food preferences |
| 📊 **BMI Calculator** | Visual BMI gauge with category and advice |
| 🔥 **Calorie Calculator** | TDEE via Mifflin-St Jeor (maintenance, loss, gain) |
| 💧 **Habit Tracker** | Workouts, water intake, sleep, mood — with charts |
| 📈 **Progress Dashboard** | Streak, charts, weekly stats |
| 🌗 **Dark / Light Mode** | Toggle with persistence |
| 📱 **Mobile Responsive** | Works on all screen sizes |

---

## 📁 Project Structure

```
Fitness Buddy/
├── app.py                    # Flask application + all API routes
├── wsgi.py                   # WSGI entry point (Gunicorn / IBM Cloud)
├── Procfile                  # Heroku / IBM Cloud Foundry start command
├── manifest.yml              # IBM Cloud Foundry manifest
├── runtime.txt               # Python version
├── requirements.txt          # Python dependencies
├── .env                      # 🔐 Credentials (NEVER commit this)
├── .env.example              # Template for .env
├── .gitignore
├── config/
│   ├── __init__.py
│   └── agent_instructions.py # 🤖 Full AI agent configuration
├── templates/
│   └── index.html            # Single-page app (Bootstrap 5)
└── static/
    ├── css/
    │   ├── style.css         # Main stylesheet (dark/light theme)
    │   └── charts.css        # Chart styling
    └── js/
        └── app.js            # All frontend logic
```

---

## ⚙️ Prerequisites

- Python 3.10+
- IBM Cloud account: https://cloud.ibm.com/registration
- IBM watsonx.ai project: https://dataplatform.cloud.ibm.com/

---

## 🔑 IBM Cloud Setup

### 1. Get IBM Cloud API Key
1. Log in to https://cloud.ibm.com
2. Go to **Manage → Access (IAM) → API keys**
3. Click **Create an IBM Cloud API key**
4. Copy and save the key securely

### 2. Create watsonx.ai Project
1. Go to https://dataplatform.cloud.ibm.com/
2. Click **New project → Create an empty project**
3. Name it (e.g. `Fitness Buddy`)
4. Go to **Manage → General** and copy the **Project ID**

### 3. Configure .env
Edit the `.env` file:
```ini
IBM_CLOUD_API_KEY=your_actual_api_key_here
WATSONX_PROJECT_ID=your_actual_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-8b-instruct
```

> **Available Granite Models:**
> - `ibm/granite-3-8b-instruct` — Best quality (recommended)
> - `ibm/granite-3-2b-instruct` — Faster, lighter
> - `ibm/granite-13b-chat-v2`   — Optimized for chat

---

## 💻 Local Development

```bash
# 1. Clone / open the project folder
cd "Fitness Buddy"

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure credentials
# Edit .env with your IBM Cloud API Key and Project ID

# 5. Run the application
python app.py

# Open in browser:  http://localhost:5000
```

---

## ☁️ IBM Cloud Deployment

### Option A — IBM Cloud Foundry

```bash
# Install IBM Cloud CLI
# https://cloud.ibm.com/docs/cli?topic=cli-install-ibmcloud-cli

# Login
ibmcloud login --sso

# Target Cloud Foundry org and space
ibmcloud target --cf

# Set environment variables (instead of .env on Cloud)
ibmcloud cf set-env fitness-buddy IBM_CLOUD_API_KEY     "your_key_here"
ibmcloud cf set-env fitness-buddy WATSONX_PROJECT_ID    "your_project_id_here"
ibmcloud cf set-env fitness-buddy WATSONX_URL           "https://us-south.ml.cloud.ibm.com"
ibmcloud cf set-env fitness-buddy WATSONX_MODEL_ID      "ibm/granite-3-8b-instruct"
ibmcloud cf set-env fitness-buddy SECRET_KEY            "a-strong-random-secret-key"

# Deploy
ibmcloud cf push fitness-buddy

# View logs
ibmcloud cf logs fitness-buddy --recent
```

### Option B — IBM Code Engine

```bash
# Build and push container image
# Then deploy via IBM Cloud Code Engine console or CLI

ibmcloud ce application create \
  --name fitness-buddy \
  --image icr.io/your-namespace/fitness-buddy:latest \
  --env IBM_CLOUD_API_KEY=your_key \
  --env WATSONX_PROJECT_ID=your_project_id \
  --env WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  --env WATSONX_MODEL_ID=ibm/granite-3-8b-instruct \
  --port 5000 \
  --min-scale 1
```

---

## 🤖 Customizing the AI Agent

Edit [`config/agent_instructions.py`](config/agent_instructions.py):

```python
# Change the agent's name
AGENT_NAME = "FitBot"

# Adjust personality
PERSONALITY = """
- More strict and direct tone
- Use technical fitness terminology
"""

# Add nutrition preferences
NUTRITION_GUIDELINES = """
- Focus on South Indian cuisine
- Include fermented foods (idli, dosa, yogurt)
"""

# Add safety rules
SAFETY_RULES = """
- Always recommend warming up before any exercise
- ...
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Chat with IBM Granite AI coach |
| `POST` | `/api/profile` | Save user profile |
| `GET`  | `/api/profile` | Get user profile |
| `POST` | `/api/bmi` | Calculate BMI |
| `POST` | `/api/calories` | Calculate daily calorie needs |
| `POST` | `/api/workout` | Generate AI workout plan |
| `POST` | `/api/meal-plan` | Generate AI meal plan |
| `GET`  | `/api/tips` | Get daily fitness tip |
| `POST` | `/api/habits` | Log daily habits |
| `GET`  | `/api/habits` | Get habit history |
| `GET`  | `/api/progress` | Get progress summary |
| `GET`  | `/api/health` | Health check |

---

## 🔒 Security Notes

1. **Never commit `.env`** — it's in `.gitignore`
2. Use **IBM Cloud Secrets Manager** or environment variables in production
3. Change `SECRET_KEY` to a strong random string in production
4. Set `FLASK_DEBUG=False` and `FLASK_ENV=production` on the server
5. Consider adding authentication (Flask-Login) for multi-user deployment

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `flask` | 3.0.3 | Web framework |
| `flask-cors` | 4.0.1 | CORS support |
| `python-dotenv` | 1.0.1 | .env file loading |
| `ibm-watsonx-ai` | 1.1.2 | IBM Granite model API |
| `gunicorn` | 22.0.0 | Production WSGI server |

---

## 🛠️ Troubleshooting

**`watsonx.ai authentication error`**
→ Verify `IBM_CLOUD_API_KEY` and `WATSONX_PROJECT_ID` in `.env`
→ Ensure your IBM Cloud account has watsonx.ai service enabled

**`ibm-watsonx-ai not installed`**
→ The app still works with demo responses. Install: `pip install ibm-watsonx-ai==1.1.2`

**`Port already in use`**
→ Change `PORT=5001` in `.env`

**Chat not responding**
→ Check `/api/health` endpoint for status
→ Review Flask console logs for errors

---

## 📄 License

MIT License — Built for IBM watsonx.ai Hackathon

---

*Made with ❤️ using IBM Granite + watsonx.ai*
