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
		const status = (body.online ? "Онлайн" : "Выключен")
		if(status == "Онлайн") {
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
			if(config.pinUpdate) {
				updatePin(body)
			}
		} else if(status == "Выключен") {
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
		if(command === 'status' || command === "stat") {
			let saddress = args[0] || config.serverAddress;
			let sport = args[1] || config.serverPort;
			const res = await fetch(`https://mcapi.us/server/status?ip=${saddress}&port=${sport ? `${sport}` : ''}`)
			if(!res) {
				message.delete().catch()
				const sentMessage = await message.channel.send(`Похоже mcapi.us недоступен!`).then(r => r.delete({
					timeout: 3000
				}));
			} else {
				const body = await res.json()
				if(body.status == "success") {
					const attachment = new Discord.MessageAttachment(Buffer.from(body.favicon.substr('data:image/png;base64,'.length), 'base64'), "icon.png")
					var playerSample = (config.showPlayerSample ? body.players.sample : "");
					var playersNow = ""
					if(playerSample != null) {
						for(var i = 0; i < playerSample.length; i++) {
							var obj = playerSample[i];
							playersNow += obj['name'] + ", ";
						}
					}
					playersNow = playersNow.replace(/,\s*$/, "")
					const cleanMotD = body.motd.replace(/§[0-9,a-z]/g,"");
					const embed = new Discord.MessageEmbed().setAuthor(`${saddress}:${sport}`).attachFiles(attachment).setThumbnail("attachment://icon.png").addFields({
						name: 'Motd',
						value: `${body.motd ? `${cleanMotD}` : '\u200b'}`
					}, {
						name: 'Version',
						value: `${body.server.name ? `${body.server.name}` : '\u200b'}`,
						inline: true
					}, {
						name: 'Status',
						value: `${(body.online ? "Online" : "Offline")}`,
						inline: true
					}, {
						name: 'Players',
						value: `${body.players.now}/${body.players.max} ${(body.players.sample == null?'':playersNow)}`
					}, ).setColor("#5b8731").setFooter(`Minecraft Server Status Bot for Discord`)
					message.channel.send(`Status for **${saddress}:${sport}**:`, {
						embed
					})
				} else {
					message.delete().catch()
					const errorm = body.error;
					message.channel.send(`Похоже сервер недоступен!`).then(r => r.delete({
						timeout: 3000
					}));
				}
			}
		}
	}
})
client.login(config.token)
