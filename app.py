import pandas as pd 
import geopandas as gpd
import requests
from shapely.geometry import Point,MultiPolygon, Polygon
import matplotlib.pyplot as plt
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.json_util import dumps
uri = "mongodb+srv://classeIntera:loto@safezone.lrtrk.mongodb.net/?retryWrites=true&w=majority&appName=safezone"
# Create a new client and connect to the server
client = MongoClient(uri)
db=client["mappaUtenti"]
app = Flask(__name__)
CORS(app) 
@app.route('/GetCity/<cityName>')
def getCity(cityName):
    cityName=cityName.capitalize()
    if cityName in map(str.capitalize, db.list_collection_names()):
        collection=db[cityName]
        documenti = list(collection.find())
        return jsonify(json.loads(dumps(documenti)))
    else:
        return "error, city not found!! :("


if __name__ == '__main__':
    app.run(debug=True)
