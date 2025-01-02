const { Client, GatewayIntentBits, EmbedBuilder  } = require('discord.js');
const {token,} = require ('./config.json');
const sqlite3 = require('sqlite3').verbose();
const allowedChannelId = "YOUR_CHANNEL_ID"
const adminUser = "YOUR_USER_ID"

// Crée une connexion à la base de données SQLite
const db = new sqlite3.Database('./scores.db', (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données :', err);
    } else {
        console.log('Connecté à la base de données SQLite.');

        // Crée la table si elle n'existe pas
        db.run(`
            CREATE TABLE IF NOT EXISTS scores (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                score INTEGER DEFAULT 0
            )
        `, (err) => {
            if (err) console.error('Erreur lors de la création de la table :', err);
        });
    }
});

// Crée le client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });


client.on('messageCreate', (message) => {

    if (message.channel.id !== allowedChannelId) {
        return; // Ignore les messages des autres canaux
    }
    if (message.content === '/help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Bot PoopCounter')
            .setColor(0x00ff00) // Vert
            .setDescription('Commandes dispos :')
            .addFields(
                { name: '+1', value: '+1 (sans dec)' },
                { name: '&leaderboard', value: 'Affiche le tableau des cacas.' },
                { name: '&help', value: 'Affiche ce message d\'aide.' }
            )
            .setFooter({ text: 'Développé avec ❤️ pour suivre vos cacas !' });

        message.channel.send({ embeds: [helpEmbed] });
    }
});


client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Écoute les messages
client.on('messageCreate', (message) => {

        if (message.channel.id !== allowedChannelId) {
        return; // Ignore les messages des autres canaux
    }
    // Vérifie que le message contient exactement "+1" et que ce n'est pas un bot
    if (message.content === '+1' && !message.author.bot) {
        const userId = message.author.id;
        const username = message.author.username;

        // Vérifie si l'utilisateur existe dans la base, puis incrémente son score
        db.get('SELECT score FROM scores WHERE user_id = ?', [userId], (err, row) => {
            if (err) {
                console.error('Erreur lors de la lecture de la base de données :', err);
                message.reply('Une erreur est survenue en essayant de mettre à jour votre score.');
            } else if (row) {
                // L'utilisateur existe, incrémente son score
                const newScore = row.score + 1;
                db.run('UPDATE scores SET score = ? WHERE user_id = ?', [newScore, userId], (err) => {
                    if (err) {
                        console.error('Erreur lors de la mise à jour du score :', err);
                        message.reply('Une erreur est survenue en essayant de mettre à jour votre score.');
                    } else {
                        message.reply(`Bravo, ${username} ! tu es maintenant à **${newScore}** cacas :)`);
                    }
                });
            } else {
                // L'utilisateur n'existe pas, l'ajoute à la base avec un score de 1
                db.run('INSERT INTO scores (user_id, username, score) VALUES (?, ?, ?)', [userId, username, 1], (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'ajout de l\'utilisateur :', err);
                        message.reply('Une erreur est survenue en essayant de créer ton score.');
                    } else {
                        message.reply(`Bienvenue, ${username} ! Ton premier caca est enregistré :)`);
                    }
                });
            }
        });
    }
});


client.on('messageCreate', (message) => {

    if (message.channel.id !== allowedChannelId) {
        return; // Ignore les messages des autres canaux
    }
    if (message.content === '/leaderboard' && !message.author.bot) {
        // Récupérer et trier les scores
        db.all('SELECT username, score FROM scores ORDER BY score DESC LIMIT 10', [], (err, rows) => {
            if (err) {
                console.error('Erreur lors de la récupération des scores :', err);
                message.reply('Une erreur est survenue lors de la récupération du tableau des scores.');
            } else {
                if (rows.length === 0) {
                    message.reply('Aucun caca enregistré pour le moment.');
                } else {
                    // Construire le message du tableau
                    let leaderboard = '**🏆 Tableau des cacas :**\n';
                    rows.forEach((row, index) => {
                        leaderboard += `**${index + 1}. ${row.username}** - ${row.score} cacas\n`;
                    });

                    message.channel.send(leaderboard);
                }
            }
        });
    }

});

client.on('messageCreate', (message) => {
    
    if (message.channel.id !== allowedChannelId) {
        return; // Ignore les messages des autres canaux
    }
    if (message.content === '/clear' && !message.author.bot) {
        // Vérifie si l'ID de l'auteur correspond à l'ID autorisé
        if (message.author.id !== adminUser) {
            return message.reply('Tu n\'as pas la permission de supprimer les scores. (chèh)');
        }

        // Supprime tous les scores de la base de données
        db.run('DELETE FROM scores', [], (err) => {
            if (err) {
                console.error('Erreur lors de la suppression des scores :', err);
                message.reply('❌ Une erreur est survenue en essayant de supprimer tous les scores.');
            } else {
                message.channel.send('✅ Tous les scores ont été supprimés de la base de données !');
            }
        });
    }
});


client.login(token);
