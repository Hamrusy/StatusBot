const ms = require('ms');
const fetch = require('node-fetch');
const Discord = require('discord.js');
const fs = require('fs');
const configFile = "./config.json";
const client = new Discord.Client();
const config = require(configFile);
const updateInterval = config.updateInterval;
const updateChannel = async() => {
	const res = await fetch(`https://mcapi.us/server/status?ip=${config.serverAddress}&port=${config.serverPort ? `${config.serverPort}` : ''}`)
	if(!res) {
		return false
	}
	else {
		const body = await res.json()
		const status = (body.online ? "Online" : "Offline")
		if(status == "Online") {
			const players = body.players.now
			const playersMax = body.players.max
			const playerCount = players + '/' + playersMax;
			const statusTitle = (playerCount.length <= 10 ? "Hi-Tech" : "MC");
			client.user.setPresence({
				activity: {
					name: statusTitle + ' | ' + playerCount
				},
				status: 'online'
			}).catch(console.error);
		} else if(status == "Offline") {
			client.user.setPresence({
				activity: {
					name: 'Hi-Tech | Выключен'
				},
				status: 'idle'
			}).catch(console.error);
			if(config.pinUpdate) {
				updatePin(body)
			}
		}
		return true
	}
}
const updateConfigFile = async() => {
	fs.writeFile(configFile, JSON.stringify(config, null, 2), function writeJSON(err) {

	});
	delete require.cache[require.resolve('./config.json')];
}
client.on('ready', () => {
	console.log(`Бот зашел под логином: ${client.user.tag}.`);
	updateChannel();
	setInterval(() => {updateChannel()}, ms(updateInterval));
});
client.on('message', async(message) => {
	if(message.content.startsWith(config.prefix)) {
		let args = message.content.replace(config.prefix, "").split(" ");
		let command = args.shift();
		// Команды
		if(command === "online" || command === "on") {
					let saddress = args[0] || config.serverAddress;
					let sport = args[1] || config.serverPort;
					const res = await fetch(`https://mcapi.us/server/status?ip=${saddress}&port=${sport ? `${sport}` : ''}`)
					if(!res) return message.channel.send(`Похоже mcapi.us не доступен!`)
					const body = await res.json()
					if(body.status == "success") {
						var playerSample = (config.showPlayerSample ? body.players.sample : "");
						var playersNow = ""
						if(playerSample != null) {
							for(var i = 0; i < playerSample.length; i++) {
								var obj = playerSample[i];
								playersNow += obj['name'] + ", ";
							}
						}
						playersNow = playersNow.replace(/,\s*$/, "")
						message.channel.send(`Онлайн: ${body.players.now}/${body.players.max}` + ` Игроки: **${playersNow}**`);
					} else {
						message.delete().catch()
						message.channel.send(`Похоже сревер не доступен!`).then(r => r.delete({
							timeout: 3000
						}));
					}
				}
	}
})
client.login(config.token)
