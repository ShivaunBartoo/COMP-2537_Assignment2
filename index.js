require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const MongoClient = require("mongodb").MongoClient;
const bcrypt = require("bcrypt");
const joi = require("joi");

const saltRounds = 12;
const expireTime = 60 * 60 * 1000; // 1 hour
const port = process.env.PORT || 3000;
const app = express();

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const uri = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true`;

main();

async function main() {
    const client = await connectToDatabase();
    const database = client.db(mongodb_database);
    const userCollection = database.collection("users");

    configureSessions(client);

    app.set("view engine", "ejs");
    app.set("views", __dirname + "/views");
    app.use(express.urlencoded({ extended: false }));
    app.use(express.static(__dirname + "/public"));

    app.get("/", (req, res) => {
        res.render("index", {
            authenticated: req.session.authenticated || false,
            username: req.session.username || "Guest",
        });
    });

    app.get("/signup", (req, res) => res.render("signup"));

    app.use((req, res) => {
        res.status(404).send("Page not found - 404");
    });

    app.listen(port, () => {
        console.log(`Node application listening on port ${port}`);
    });
}

async function connectToDatabase() {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");
    return client;
}

function configureSessions(client) {
    let mongoStore = MongoStore.create({
        client: client,
        dbName: mongodb_database,
        collectionName: "sessions",
        crypto: {
            secret: mongodb_session_secret,
        },
    });
    app.use(
        session({
            secret: node_session_secret,
            store: mongoStore,
            saveUninitialized: false,
            resave: true,
        })
    );
}
