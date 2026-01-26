# FlowMate - No-Code Workflow Automation

A minimalist, high-performance workflow automation platform using a **When → If → Do** narrative logic.

## 🎨 Theme: Sand & Biscuit
- **Minimalist**: Focus on task simplicity and calm aesthetics.
- **Natural Tones**: Sand, Biscuit, and Terracotta palette.
- **Typography**: Gravitas One (Headings) & Inter (Body).
- **Icons**: Bootstrap Icons.

## 🚀 Key Features
- **Visual Flow Builder**: Vertical, narrative-style node connection.
- **Real Integrations**:
  1. **Email Monitor**: Real-time folder monitoring for simulated "emails".
  2. **Website Monitor**: Live data fetching from the GitHub Public API.
- **Dashboard & Analytics**: Real-time charts for execution trends.
- **AI Assistant**: Natural language to workflow suggestion engine.

## 🛠️ Setup Instructions

### 1. Frontend (UI)
- Open `index.html` with **Live Server** in VS Code.
- Login with any username/password.

### 2. Automation Engine (Python)
```bash
cd python
pip install -r requirements.txt
python engine.py
```
*Engine runs on http://localhost:5001*

### 3. Test Email Monitor
1. Create a folder named `inbox/` in the `python/` directory.
2. Add a file `alert.txt` with the text: "This is an urgent task".
3. In the UI, create a flow: **Email Monitor** → Keyword: **urgent** → **Send Notification**.
4. Run the flow!

## 📂 File Structure
- `index.html`: Main SPA structure.
- `css/styles.css`: Custom "Sand & Biscuit" theme.
- `js/app.js`: Application logic and local storage management.
- `python/engine.py`: Functional automation engine for real-world API calls.
