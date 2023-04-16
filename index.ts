import dotenv from "dotenv";
dotenv.config();
import * as Eris from "eris";
import Express from "express";
import fs from "fs";
import path from "path";

type UserData = {
    inventory: string[];
    money: number;
    dailyTime: number;
    searchTime: number;
    level: number;
    xp: number;
}

const app = Express();
const port = 3000;
const commands = {};
const games = ["Half-Life","Half-Life 2","Half-Life 2 Episode 1","Half-Life 2 Episode 2","Portal","Portal 2"]

export const client: Eris.Client = new Eris.Client(`Bot ${process.env.BOT_TOKEN}`);

export function randomRange(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
}

export function getUserData(userId: string): UserData | null {
    const rawData = fs.readFileSync("userdata.json","utf-8");
    const data = JSON.parse(rawData);
    return data[userId] || null;
}

export function setUserData(userId: string,newUserData) {
    const rawData = fs.readFileSync("userdata.json","utf-8");
    const data = JSON.parse(rawData);
    data[userId] = newUserData || {};
    fs.writeFileSync("userdata.json",JSON.stringify(data,null,4));
}

function setupUsersData(userId: string) {
    var userData = getUserData(userId);
    if (userData == null) {
        setUserData(userId,{
            inventory: [],
            money: 0,
            dailyTime: Date.now(),
            level: 1,
            xp: 0
        });
    } else {
        if (typeof(userData.inventory) === "undefined") {
            userData.inventory = [];
        }
        if (typeof(userData.money) === "undefined") {
            userData.money = 0;
        }
        if (typeof(userData.dailyTime) === "undefined") {
            userData.dailyTime = Date.now();
        }
        if (typeof(userData.level) === "undefined") {
            userData.level = 1;
        }
        if (typeof(userData.xp) === "undefined") {
            userData.xp = 0;
        }
        setUserData(userId,userData);
    }
}

async function initializeSlashCommands() {
    const commandsToEdit = [];
    for (let file of fs.readdirSync(path.join(__dirname,"commands"))) {
        const fileName = path.parse(file).name;
        if (fileName == "template") continue;
        const commandModule = require(path.join(__dirname,`commands/${file}`));
        commands[fileName] = commandModule;
        commandsToEdit.push({
            name: commandModule.name,
            description: commandModule.description,
            options: commandModule.options,
            type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT
        });
        
    }
    client.bulkEditCommands(commandsToEdit);
}

client.on("ready",() => {
    console.log("Ready");
    initializeSlashCommands();
    client.editStatus("online",{
        name: games[Math.random() * games.length],
        type: Eris.Constants.ActivityTypes.GAME
    });
    setInterval(() => {
        client.editStatus("online",{
            name: games[Math.floor(Math.random() * games.length)],
            type: Eris.Constants.ActivityTypes.GAME
        });
    },6000);
})

client.on("error",(err) => {
    console.error(err);
})

client.on("messageCreate",(message) => {
    if (message.author.bot) return;
    setupUsersData(message.author.id);
    var userData = getUserData(message.author.id);
    userData.xp += 1;
    if (userData.xp >= userData.level * 10) {
        userData.level += 1;
        if (message.channel instanceof Eris.TextChannel) {
            message.channel.createMessage({
                content: `${message.author.mention} has reached **level ${userData.level.toString()}**!`,
                messageReference: {
                    channelID: message.channel.id,
                    failIfNotExists: false,
                    guildID: message.guildID,
                    messageID: message.id
                }
            });
        }
    }
    setUserData(message.author.id,userData);
})

client.on("interactionCreate",async (interaction: Eris.Interaction) => {
    if (interaction instanceof Eris.CommandInteraction) {
        if (!interaction.member) return interaction.createMessage("You can only use this command in a guild!");
        setupUsersData(interaction.member.id);
        const command = commands[interaction.data.name];
        await interaction.defer();
        return command.execute(interaction);
    }
    if (interaction instanceof Eris.ComponentInteraction) {
        if (
            typeof(interaction.message.interaction) === "undefined"
        ) return;
        const command = commands[interaction.message.interaction.name];
        return command.execute(interaction);
    }
})

app.get("/",(req,res) => {
    res.send("Bot is ready to serve.");
})

app.listen(port,() => {
    console.log(`Listening on port ${port.toString()}`);
})

client.connect();