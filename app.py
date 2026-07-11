"""
=============================================================================
Fitness Buddy — Main Flask Application
IBM watsonx.ai + IBM Granite Models Integration
=============================================================================
"""

import os
import json
import math
import logging
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ---------------------------------------------------------------------------
# Import agent instructions
# ---------------------------------------------------------------------------
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config.agent_instructions import get_system_prompt

# ---------------------------------------------------------------------------
# IBM watsonx.ai SDK
# ---------------------------------------------------------------------------
try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
    WATSONX_AVAILABLE = True
except ImportError:
    WATSONX_AVAILABLE = False
    logging.warning("ibm-watsonx-ai not installed. Using mock responses.")

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fitness-buddy-secret")
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# watsonx.ai Client
# ---------------------------------------------------------------------------
def get_watsonx_client():
    """Initialize and return an IBM watsonx.ai ModelInference client."""
    if not WATSONX_AVAILABLE:
        return None
    try:
        credentials = Credentials(
            url=os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
            api_key=os.getenv("IBM_CLOUD_API_KEY"),
        )
        model = ModelInference(
            model_id=os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct"),
            credentials=credentials,
            project_id=os.getenv("WATSONX_PROJECT_ID"),
            params={
                GenParams.MAX_NEW_TOKENS: int(os.getenv("MAX_TOKENS", 1024)),
                GenParams.TEMPERATURE: float(os.getenv("TEMPERATURE", 0.7)),
                GenParams.TOP_P: float(os.getenv("TOP_P", 0.9)),
                GenParams.TOP_K: int(os.getenv("TOP_K", 50)),
                GenParams.STOP_SEQUENCES: ["<|endoftext|>"],
            },
        )
        return model
    except Exception as e:
        logger.error(f"watsonx.ai initialization error: {e}")
        return None


# ---------------------------------------------------------------------------
# Chat with IBM Granite
# ---------------------------------------------------------------------------
def chat_with_granite(user_message: str, user_profile: dict = None,
                      chat_history: list = None) -> str:
    """Send a message to IBM Granite and return the response."""
    model = get_watsonx_client()
    system_prompt = get_system_prompt(user_profile)

    # Build conversation history
    history_text = ""
    if chat_history:
        for msg in chat_history[-6:]:   # Keep last 6 exchanges for context
            role = "User" if msg.get("role") == "user" else "FitBot"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""<|system|>
{system_prompt}
<|user|>
{history_text}User: {user_message}
<|assistant|>
FitBot:"""

    if model:
        try:
            response = model.generate_text(prompt=prompt)
            return response.strip() if response else fallback_response(user_message)
        except Exception as e:
            logger.error(f"Granite generation error: {e}")
            return fallback_response(user_message)
    else:
        return fallback_response(user_message)


def fallback_response(message: str) -> str:
    """Return a helpful demo response when watsonx.ai is unavailable."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["workout", "exercise", "train"]):
        return (
            "💪 **Home Workout Plan (30 min)**\n\n"
            "**Warm-Up (5 min)**\n"
            "1. Jumping Jacks — 2 × 30 sec\n"
            "2. Arm Circles — 1 × 30 sec each direction\n"
            "3. Hip Rotations — 1 × 30 sec\n\n"
            "**Main Circuit (20 min)**\n"
            "1. Push-Ups — 3 × 12 reps | Rest 45 sec\n"
            "2. Squats — 3 × 15 reps | Rest 45 sec\n"
            "3. Plank — 3 × 30 sec | Rest 30 sec\n"
            "4. Mountain Climbers — 3 × 20 reps | Rest 45 sec\n"
            "5. Glute Bridges — 3 × 15 reps | Rest 45 sec\n\n"
            "**Cool-Down (5 min)**\n"
            "1. Child's Pose — 1 min\n"
            "2. Hamstring Stretch — 30 sec each leg\n"
            "3. Chest Opener — 30 sec\n\n"
            "💡 Tip: Stay hydrated! Drink water before, during, and after your workout.\n\n"
            "💪 Let's keep going!"
        )
    elif any(w in msg_lower for w in ["meal", "diet", "food", "eat", "nutrition"]):
        return (
            "🥗 **Healthy Indian Meal Plan (≈1800 kcal)**\n\n"
            "**Breakfast** (~400 kcal)\n"
            "- Oats Upma with veggies + 1 glass warm water with lemon\n"
            "- OR Moong Dal Chilla (2 pcs) + curd\n\n"
            "**Mid-Morning Snack** (~150 kcal)\n"
            "- 1 banana + handful of roasted chana\n\n"
            "**Lunch** (~500 kcal)\n"
            "- 2 Roti + Dal Tadka + Sabzi + Salad + Curd\n"
            "- OR Brown Rice + Rajma + Cucumber Raita\n\n"
            "**Evening Snack** (~150 kcal)\n"
            "- Green Tea + Handful of mixed nuts\n\n"
            "**Dinner** (~500 kcal)\n"
            "- 2 Roti + Paneer Bhurji + Salad\n"
            "- OR Khichdi + Stir-fried veggies\n\n"
            "💧 Drink at least 8 glasses of water throughout the day!\n\n"
            "💪 Let's keep going!"
        )
    elif any(w in msg_lower for w in ["bmi", "weight", "height"]):
        return (
            "📊 To calculate your BMI, please use the **BMI Calculator** tab above.\n\n"
            "BMI Categories:\n"
            "- Underweight : < 18.5\n"
            "- Normal      : 18.5 – 24.9\n"
            "- Overweight  : 25.0 – 29.9\n"
            "- Obese       : ≥ 30.0\n\n"
            "Remember — BMI is just one metric. Muscle mass, body composition, "
            "and overall lifestyle matter just as much!\n\n"
            "💪 Let's keep going!"
        )
    elif any(w in msg_lower for w in ["motivat", "inspire", "quote"]):
        quotes = [
            "\"The only bad workout is the one that didn't happen.\" — Keep moving! 🏃",
            "\"Success is the sum of small efforts repeated day in and day out.\" — Stay consistent! 🔥",
            "\"Take care of your body. It's the only place you have to live.\" — Jim Rohn 🌟",
            "\"Your body can stand almost anything. It's your mind you have to convince.\" 💪",
        ]
        import random
        return f"✨ **Motivation for You**\n\n{random.choice(quotes)}\n\n💪 Let's keep going!"
    else:
        return (
            "👋 Hi! I'm **FitBot**, your AI-powered fitness buddy!\n\n"
            "I can help you with:\n"
            "🏋️ Personalized home workout plans\n"
            "🥗 Indian meal plans & nutrition advice\n"
            "📊 BMI & calorie calculations\n"
            "💧 Habit tracking (water, sleep, workouts)\n"
            "💪 Motivation & fitness tips\n\n"
            "Try asking: *\"Give me a 30-min home workout\"* or "
            "*\"Create a healthy meal plan for weight loss\"*\n\n"
            "💪 Let's keep going!"
        )


# ===========================================================================
# ROUTES
# ===========================================================================

@app.route("/")
def index():
    """Serve the main application page."""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat messages from the frontend."""
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    user_message = data.get("message", "").strip()
    user_profile = data.get("profile", session.get("user_profile", {}))
    chat_history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    response = chat_with_granite(user_message, user_profile, chat_history)
    return jsonify({
        "response": response,
        "timestamp": datetime.now().isoformat(),
    })


@app.route("/api/profile", methods=["POST"])
def save_profile():
    """Save user profile to session."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    session["user_profile"] = data
    logger.info(f"Profile saved for user: {data.get('name', 'Unknown')}")
    return jsonify({"message": "Profile saved successfully", "profile": data})


@app.route("/api/profile", methods=["GET"])
def get_profile():
    """Retrieve user profile from session."""
    return jsonify(session.get("user_profile", {}))


@app.route("/api/bmi", methods=["POST"])
def calculate_bmi():
    """Calculate BMI and return category + advice."""
    data = request.get_json()
    try:
        weight = float(data["weight"])   # kg
        height = float(data["height"])   # cm
        height_m = height / 100
        bmi = round(weight / (height_m ** 2), 1)

        if bmi < 18.5:
            category = "Underweight"
            advice = ("Focus on nutrient-dense foods and strength training "
                      "to build healthy muscle mass.")
            color = "#3b82f6"
        elif bmi < 25:
            category = "Normal Weight"
            advice = ("Great work! Maintain your weight with a balanced diet "
                      "and regular exercise.")
            color = "#22c55e"
        elif bmi < 30:
            category = "Overweight"
            advice = ("Consider increasing physical activity and reducing "
                      "processed foods for gradual, healthy weight loss.")
            color = "#f59e0b"
        else:
            category = "Obese"
            advice = ("Please consult a healthcare provider. Focus on low-impact "
                      "exercise and a calorie-controlled diet.")
            color = "#ef4444"

        return jsonify({
            "bmi": bmi,
            "category": category,
            "advice": advice,
            "color": color,
        })
    except (KeyError, ValueError, ZeroDivisionError) as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/calories", methods=["POST"])
def calculate_calories():
    """Calculate TDEE using Mifflin-St Jeor equation."""
    data = request.get_json()
    try:
        weight = float(data["weight"])     # kg
        height = float(data["height"])     # cm
        age = int(data["age"])
        gender = data["gender"].lower()
        activity = data.get("activity", "moderate")

        # Mifflin-St Jeor BMR
        if gender == "male":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161

        activity_multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "active": 1.725,
            "very_active": 1.9,
        }
        multiplier = activity_multipliers.get(activity, 1.55)
        tdee = round(bmr * multiplier)
        bmr = round(bmr)

        return jsonify({
            "bmr": bmr,
            "tdee": tdee,
            "weight_loss": tdee - 500,
            "weight_gain": tdee + 300,
            "maintenance": tdee,
        })
    except (KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/workout", methods=["POST"])
def generate_workout():
    """Generate a personalized workout plan via Granite."""
    data = request.get_json()
    profile = data.get("profile", session.get("user_profile", {}))
    level = profile.get("fitness_level", "beginner")
    goal = profile.get("goal", "general fitness")
    duration = profile.get("workout_time", 30)

    prompt = (
        f"Create a detailed {duration}-minute home workout plan for a {level} "
        f"person whose goal is {goal}. Include warm-up, main exercises with sets "
        f"and reps, and cool-down. Use Indian exercise names where appropriate."
    )

    response = chat_with_granite(prompt, profile)
    return jsonify({"workout": response})


@app.route("/api/meal-plan", methods=["POST"])
def generate_meal_plan():
    """Generate a personalized Indian meal plan via Granite."""
    data = request.get_json()
    profile = data.get("profile", session.get("user_profile", {}))
    goal = profile.get("goal", "general fitness")
    diet = profile.get("diet", "vegetarian")
    calories = data.get("target_calories", 1800)

    prompt = (
        f"Create a one-day healthy Indian meal plan for someone with a goal of "
        f"{goal}. Diet preference: {diet}. Target: ~{calories} calories. "
        f"Include breakfast, lunch, dinner, and snacks with approximate calories."
    )

    response = chat_with_granite(prompt, profile)
    return jsonify({"meal_plan": response})


@app.route("/api/tips", methods=["GET"])
def get_tips():
    """Return daily motivational tips."""
    tips = [
        "💧 Drink a glass of water first thing every morning.",
        "🏃 A 20-min walk is better than no workout at all.",
        "🥗 Fill half your plate with vegetables at every meal.",
        "😴 7-9 hours of sleep is essential for muscle recovery.",
        "🧘 5 minutes of deep breathing reduces cortisol and stress.",
        "📱 Put your phone down 1 hour before bed for better sleep.",
        "🍌 Eat a banana 30 min before your workout for natural energy.",
        "🕐 Eat dinner at least 2 hours before bedtime.",
        "🏋️ Progressive overload: add 1 rep or 1 kg each week.",
        "🎯 Set SMART fitness goals: Specific, Measurable, Achievable, Relevant, Time-bound.",
    ]
    day = datetime.now().timetuple().tm_yday
    return jsonify({"tip": tips[day % len(tips)]})


@app.route("/api/habits", methods=["POST"])
def log_habit():
    """Log daily habits (workout, water, sleep)."""
    data = request.get_json()
    if "habits" not in session:
        session["habits"] = []
    habit_entry = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "workout_done": data.get("workout_done", False),
        "water_glasses": int(data.get("water_glasses", 0)),
        "sleep_hours": float(data.get("sleep_hours", 0)),
        "mood": data.get("mood", "neutral"),
    }
    habits = session.get("habits", [])
    habits.append(habit_entry)
    session["habits"] = habits[-30:]   # Keep last 30 days
    return jsonify({"message": "Habit logged", "entry": habit_entry})


@app.route("/api/habits", methods=["GET"])
def get_habits():
    """Return logged habits."""
    return jsonify({"habits": session.get("habits", [])})


@app.route("/api/progress", methods=["GET"])
def get_progress():
    """Return progress summary."""
    habits = session.get("habits", [])
    if not habits:
        return jsonify({"message": "No data yet. Start logging your habits!"})

    workouts = sum(1 for h in habits if h.get("workout_done"))
    avg_water = round(sum(h.get("water_glasses", 0) for h in habits) / len(habits), 1)
    avg_sleep = round(sum(h.get("sleep_hours", 0) for h in habits) / len(habits), 1)

    return jsonify({
        "total_days": len(habits),
        "workouts_completed": workouts,
        "workout_percentage": round((workouts / len(habits)) * 100),
        "avg_water_glasses": avg_water,
        "avg_sleep_hours": avg_sleep,
        "streak": _calculate_streak(habits),
    })


def _calculate_streak(habits: list) -> int:
    """Calculate current consecutive day streak."""
    if not habits:
        return 0
    streak = 0
    for h in reversed(habits):
        if h.get("workout_done"):
            streak += 1
        else:
            break
    return streak


@app.route("/api/health")
def health():
    """Health check endpoint for IBM Cloud deployment."""
    return jsonify({
        "status": "healthy",
        "app": os.getenv("APP_NAME", "Fitness Buddy"),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "watsonx_available": WATSONX_AVAILABLE,
        "timestamp": datetime.now().isoformat(),
    })


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    logger.info(f"Starting Fitness Buddy on port {port} (debug={debug})")
    app.run(host="0.0.0.0", port=port, debug=debug)
