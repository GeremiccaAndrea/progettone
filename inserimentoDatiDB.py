import geopandas as gpd
import pandas as pd
from shapely.geometry import MultiPolygon, Polygon, Point
from pymongo import MongoClient
import requests

# Connessione al database
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
client = MongoClient(uri)
db = client["mappaUtenti"]

# Eliminazione documenti che non contengono i campi richiesti
db.segnalazioni.delete_many({
    "$or": [
        { "_id": { "$exists": False } },
        { "arresto": { "$exists": False } },
        { "tipologia": { "$exists": False } },
        { "data": { "$exists": False } },
        { "quartiere": { "$exists": False } },
        { "citta": { "$exists": False } },
        { "descrizione": { "$exists": False } }
    ]
})

print("Documenti eliminati con successo.")
