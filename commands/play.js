const ytdl = require("ytdl-core");
const fetch = require("node-fetch");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DOMParser = require('dom-parser');

module.exports = {
  name: "play",
  description: "Play a song in your channel!",
  async execute(message) {
    try {
      const args = message.content.split(" ");
      const queue = message.client.queue;
      const serverQueue = message.client.queue.get(message.guild.id);


      //const voiceChannel = message.member.voice.channel;
      const voiceChannel = message.guild.channels.cache.get("528536991235833861");

      if (!voiceChannel)
        return message.channel.send(
          "You need to be in a voice channel to play music!"
        );
      const permissions = voiceChannel.permissionsFor(message.client.user);
      if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
          "I need the permissions to join and speak in your voice channel!"
        );
      }

      
      let songInfo = '';
      let customSearchLink = '';

      //Determine if it is a link or a search
      if(ytdl.validateURL( args[1]))
      {
        songInfo = await ytdl.getInfo(args[1]);
      }
      else{ //not a valid link, user inputted something custom

        let query = 'https://www.youtube.com/results?search_query=' + message.content.substring(6).replace(/ /g,"+")

        //message.channel.send(query);

        await fetch(query)
        .then(data=>{return data.text()})
        .then(res=>{
          let s = res.indexOf('watch?v=');

          theSubstring = res.substring(s,s+50);

          a = theSubstring.split('"');
          //message.channel.send(a[0]); 

          customSearchLink = a[0];
          //message.channel.send(s);
        

        });
        songInfo = await ytdl.getInfo('https://www.youtube.com/'+ customSearchLink);

      }


      const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
      };

      if (!serverQueue) {
        const queueContruct = {
          textChannel: message.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 5,
          playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
          var connection = await voiceChannel.join();
          queueContruct.connection = connection;
          this.play(message, queueContruct.songs[0]);
        } catch (err) {
          console.log(err);
          queue.delete(message.guild.id);
          return message.channel.send(err);
        }
      } else {
        serverQueue.songs.push(song);
        return message.channel.send(
          `${song.title} has been added to the queue!`
        );
      }
    } catch (error) {
      console.log(error);
      message.channel.send(error.message);
    }
  },



  play(message, song) {
    const queue = message.client.queue;
    const guild = message.guild;
    const serverQueue = queue.get(message.guild.id);

    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }

    const dispatcher = serverQueue.connection
      .play(ytdl(song.url))
      .on("finish", () => {
        serverQueue.songs.shift();
        this.play(message, serverQueue.songs[0]);
      })
      .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
  }
};
