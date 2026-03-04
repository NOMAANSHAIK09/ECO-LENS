from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import requests
import sqlite3
from flask_sqlalchemy import SQLAlchemy



# Load environment variables
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise RuntimeError("DEEPSEEK_API_KEY not set")

app = Flask(__name__)




database_url = os.getenv("DATABASE_URL")

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

#app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")

db = SQLAlchemy(app)

class User(db.Model):   # class name should be Capital
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False, unique=True)
    email = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(150), nullable=False)






SYSTEM_PROMPT = """
You are EcoLens — an environmental sustainability expert.

Return STRICT JSON ONLY in this format:

{
  "responsible_usage": "",
  "disposal_method": "",
  "reuse_ideas": "",
  "harm_minimization": "",
  "alternatives": "",
  "biodegradable_advice": "",
  "eco_score": 0
}
"""

DEEPSEEK_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# login and sign up page 

@app.route("/")
def home():

    return render_template("index.html", username=session.get("username"))


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        product = data.get("product")

        if not product:
            return jsonify({"success": False, "error": "Product missing"}), 400

        url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "deepseek/deepseek-chat",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f'Analyze: "{product}"'}
            ],
            "temperature": 0.2
        }

        response = requests.post(url, headers=headers, json=payload)

        print("Status:", response.status_code)
        print("Response:", response.text)

        if response.status_code != 200:
            return jsonify({
                "success": False,
                "error": "AI quota exceeded or API error",
                "details": response.text
            }), 500

        result_text = response.json()["choices"][0]["message"]["content"]

        return jsonify({
            "success": True,
            "result": result_text
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/signup", methods=["POST","GET"])
def signup_page():
        
        return render_template("signup.html")

@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"success": False, "error": "All fields required"}), 400

    # Check duplicate
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "error": "Username already exists"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": "Email already exists"}), 400

    new_user = User(username=username, email=email, password=password)

    db.session.add(new_user)
    db.session.commit()

    # Store session
    session["username"] = username

    return jsonify({"success": True, "redirect": "/"}), 201


# -----------------------------
# LOGIN USER
# -----------------------------
@app.route("/login-user", methods=["POST"])
def login_user():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    user_record = User.query.filter_by(username=username).first()

    if user_record and user_record.password == password:
        session["username"] = username  # 🔥 Store session
        return jsonify({"success": True, "redirect": "/"})
    else:
        return jsonify({"success": False, "error": "Invalid username or password"}), 401


# -----------------------------
# LOGOUT
# -----------------------------
@app.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("home"))


# -----------------------------
# RUN APP
# -----------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
