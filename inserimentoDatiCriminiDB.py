import pandas as pd
from pymongo import MongoClient
import json
import requests
from datetime import datetime

def insert_crime_data(city_name, crime_file, crime_url):
    """
    Inserisce i dati dei crimini nel database MongoDB.
    
    :param city_name: Nome della città (string)
    :param crime_file: Percorso al file CSV/JSON contenente i dati dei crimini
    :param crime_url: URL da cui scaricare i dati in formato JSON
    """
    # Caricamento dati
    if crime_file.endswith('.csv'):
        df = pd.read_csv(crime_file)
    elif crime_file.endswith('.json'):
        df = pd.read_json(crime_file)
    elif not crime_file:
        x = requests.get(crime_url)
        df = pd.DataFrame(x.json())
    else:
        raise ValueError("Formato file non supportato!")
    
    # Creazione del DataFrame con i campi richiesti
    df_crimes = df[["tipo_reato", "data", "quartiere"]].copy()

    # Converti la colonna "date" in formato datetime
    df_crimes["data"] = pd.to_datetime(df_crimes["date"], errors="coerce")

    # Connessione a MongoDB
    uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
    client = MongoClient(uri)
    db = client["mappaUtenti"]
    collection = db["Crimini"]  # Nome collezione basato sulla città

    # Creazione del payload per MongoDB
    data_to_insert = []
    
    for index, row in df_crimes.iterrows():
        data = {
            "id": index,  # Usa l'indice come ID
            "arresto": row.get("", False),  # Default False se il campo non esiste
            "tipologia": row.get("tipo_reato", "Sconosciuto"),  # Default "Sconosciuto"
            "data": row.get("data", None),  # Data in formato datetime
            "quartiere": row.get("quartiere", None),
            "citta": city_name.capitalize()
        }
        data_to_insert.append(data)

    # Inserimento nel database
    collection.insert_many(data_to_insert)
    print(f"Dati dei crimini per {city_name} inseriti con successo nella collezione crimini.")

# Esempio di utilizzo#
#insert_crime_data("Chicago", "", "https://data.cityofchicago.org/resource/ijzp-q8t2.json")
insert_crime_data("Milano", "reati_milano_100.json", "")
