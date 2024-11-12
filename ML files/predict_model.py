import sys
import json
import pandas as pd
from xgboost import XGBRegressor
import calendar

def predict(global_df):
    model = XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    
    predictions = {}
    latest_year = global_df['Year'].max()
    prediction_year = latest_year + 1

    for month in range(1, 13):
        month_data = global_df[global_df['Month'] == month]
        if month_data.empty:
            continue
        
        X = month_data[['Year']]
        y = month_data['Monthly_Expenditure']
        
        model.fit(X, y)
        
        future_year = pd.DataFrame({'Year': [prediction_year]})
        prediction = model.predict(future_year)[0]
        
        predictions[month] = prediction

    predictions_df = pd.DataFrame(list(predictions.items()), columns=['Month', 'Predicted_Monthly_Expenditure'])
    predictions_df['Month_Name'] = predictions_df['Month'].apply(lambda x: calendar.month_name[x])
    predictions_df = predictions_df[['Month', 'Month_Name', 'Predicted_Monthly_Expenditure']]
    
    # Round the predicted monthly expenditure values
    predictions_df['Predicted_Monthly_Expenditure'] = predictions_df['Predicted_Monthly_Expenditure'].round(0)
    
    return predictions_df

# Read JSON input from stdin
if __name__ == "__main__":
    input_data = json.load(sys.stdin)  # Read JSON from stdin
    global_df = pd.DataFrame(input_data)  # Convert JSON to DataFrame
    
    # Run prediction and output results as JSON
    predictions_df = predict(global_df)
    print(predictions_df.to_json(orient="records"))  # Output JSON format
