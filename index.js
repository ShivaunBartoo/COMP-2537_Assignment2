require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const MongoClient = require("mongodb").MongoClient;
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const joi = require("joi");
const fs = require("fs");
const { log } = require("console");

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

    configureSessions(client);

    app.set("view engine", "ejs");
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(express.static(__dirname + "/public"));

    registerRoutes(client);

    app.use((req, res) => {
        res.status(404).send("Page not found - 404");
    });

    app.listen(port, () => {
        console.log(`Node application listening on port http://localhost:${port}`);
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
            cookie: {
                maxAge: 60 * 60 * 1000,
            },
        })
    );

    app.use((req, res, next) => {
        res.locals.session = req.session;
        next();
    });
}



function registerRoutes(client) {
    const database = client.db(mongodb_database);
    const userCollection = database.collection("users");

    app.get("/", (req, res) => {
        res.render("main", {
            body: "partials/index",
        });
    });

    app.get("/signup", (req, res) => {
        res.render("main", {
            title: "Create an Account",
            body: "partials/signup",
            shortPage: true,
        });
    });

    app.post("/signupSubmit", async (req, res) => {
        const schema = joi.object({
            username: joi.string().alphanum().min(3).required(),
            email: joi.string().email().min(5).required(),
            password: joi.string().min(3).required(),
        });

        const { error } = schema.validate(req.body, { abortEarly: false });
        const response = { status: "ok" };

        if (error) {
            response.status = "bad";
            error.details.forEach((detail) => {
                const field = detail.context.key;
                response[field] = detail.message;
            });
        } else {
            console.log("creating user");
            let hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
            userCollection.insertOne({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
                user_type: 'user',
            });
            req.session.username = req.body.username;
            req.session.authenticated = true;
        }
        res.json(response);
    });

    app.get("/login", (req, res) => {
        res.render("main", {
            title: "Log In",
            body: "partials/login",
            shortPage: true,
        });
    });

    app.post("/loginSubmit", async (req, res) => {
        const schema = joi.object({
            email: joi.string().required(),
            password: joi.string().required(),
        });

        const { error } = schema.validate(req.body);

        if (error) {
            console.log("Validation error:", error.details);
            return res.status(401).json({ status: "bad" });
        }
        const user = await userCollection.findOne({ email: req.body.email });
        if (!user) {
            console.log("User not found for email:", req.body.email);
            return res.status(401).json({ status: "bad" });
        }
        const passwordValid = await bcrypt.compare(req.body.password, user.password);
        if (!passwordValid) {
            console.log("Invalid password for username:", req.body.username);
            return res.status(401).json({ status: "bad" });
        }
        req.session.username = user.username;
        req.session.authenticated = true;
        req.session.user_type = user.user_type;
        res.status(200).json({ status: "ok" });
    });

    app.get("/logout", (req, res) => {
        req.session.destroy();
        res.redirect("/");
    });

    app.get("/members", (req, res) => {
        if (req.session.authenticated) {
            res.render("main", {
                title: `Hello, ${req.session.username}`,
                body: "partials/members",
            });
        } else {
            res.redirect("/");
        }
    });

    app.get("/admin", async (req, res) => {
        if (req.session.authenticated) {
            if(req.session.user_type == "admin"){
                const users = await userCollection.find().toArray();
                res.render("main", {
                title: "Admin Panel",
                body: "partials/admin",
                users: users,
            });
            }
            else{
                res.status(403).render("main", {
                title: "Admin Panel",
                body: "partials/admin",
            });
            }
        } else {
            res.redirect("/");
        }
    });

    app.post("/userStatus", async (req, res) => {
        const {id, user_type } = req.body;
        if(id && user_type){
            if(!(user_type == "user" || user_type == "admin")){
                res.status(400).send("Bad Request: Invalid user_type.");
            }
            const objectID = new ObjectId(id)
            const user = await userCollection.findOne({_id: objectID});
            if (user) {
                await userCollection.updateOne({_id: objectID}, {$set: {user_type}});
                res.status(200).send();
            } else {
                res.status(400).send("Bad Request: Invalid user id.");
            }
        }
        else{
            res.status(400).send("Bad Request: Missing 'id' or 'user_type' in the request body.");
        }
    })
}
