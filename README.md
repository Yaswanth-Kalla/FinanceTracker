# ExpenseTracker

**ExpenseTracker** is a web-based application that helps users track and visualize their expenses. It provides user authentication (manual or via Google), processes bank statements in Excel format, and displays expenses in table and chart formats. Additionally, it uses machine learning to predict future monthly expenditures for the next 12 months.

## Features

### Authentication
- **Manual Login/Signup**: Secure user authentication using email and password using Passport authentication.
- **Google OAuth Integration**: Option to authenticate users with their Google accounts.

### Expense Management
- **Upload Bank Statements**: Users can upload their bank statements in Excel format for expense tracking.
- **Expense Table**: Displays uploaded expenses in a tabular format for clarity and detailed view.

### Data Visualization
- **Charts for Expenses**:
  - Line Chart
  - Bar Chart
  - Pie Chart

### Machine Learning
- **Expense Prediction**: Predicts future monthly expenditures for the next 12 months based on past data using machine learning.

## Tech Stack

### Frontend
- **HTML/CSS**
- **JavaScript**
- **Chart.js**: For interactive chart visualizations

### Backend
- **Node.js**
- **Express.js**

### Database
- **MongoDB**: For storing user data and expense records

### Machine Learning
- **Python**: For implementing the predictive model
- **Spawn Process**: For running the ML model as a child process from the backend

### Additional Libraries/Tools
- **Passport.js**: For authentication
- **Pandas**: For processing Excel data
- **xgboost (XGBRegressor)**: For machine learning
- **Google OAuth API**: For Google-based authentication

## Usage

1. **Register or Login**: Use manual authentication or log in via Google.
2. **Upload Expenses**: Upload your bank statements in Excel format.
3. **View Expenses**: Explore your expenses in tabular format and visualizations (line chart, bar chart, pie chart).
4. **Expense Predictions**: View predicted monthly expenditures for the next 12 months based on historical data.

## Screenshots

### Homepage
![Homepage](images/homepage1.png)
![Homepage](images/homepage2.png)

### Login Page
![Login Page](images/login%20page.png)

### Signup Page
![Signup Page](images/signup%20page.png)

### Statement Upload Page
![Statement Upload Page](images/statement%20upload.png)

### Track Statement Page (Charts and Table)
![Track Statement Page](images/track%20statement(Bar%20chart).png)
![Track Statement Page](images/track%20statement(Line%20chart).png)
![Track Statement Page](images/track%20statement(Pie%20chart).png)
![Track Statement Page](images/track%20statement(Table).png)

### Predict Page
![Predict Page](images/prediction%20page(charts).png)
![Predict Page](images/prediction%20page(table).png)

## Future Enhancements
- Add support for more bank statement formats.
- Improve prediction accuracy with more sophisticated ML models.
- Enable sharing expense reports via email.

## Contributing
Contributions are welcome! Please fork this repository and submit a pull request with your changes.
