'use strict';
/**
 * Auto-room themes.
 *
 * The server keeps a handful of rooms from the active theme open at all times.
 * Each room has a `title` and an `opener`: the one question "Monocle Guide" posts
 * when the room is created. The guide never posts again after that.
 *
 * Openers are opinion questions or widely reported launch facts, so nothing here
 * needs updating when the news moves.
 *
 * To add a theme: copy the `gta6` block, give it a new key, then run the server
 * with AUTO_THEME=<key>. To turn auto rooms off: AUTO_ROOMS=off.
 */

const THEMES = {
  gta6: {
    topic: 'gaming',
    rooms: [
      {
        title: '30 fps in 2026: dealbreaker or fine? (no spoilers)',
        opener: 'Rockstar says consoles are locked to 30 fps. Does it bother you, or do you stop noticing after an hour?',
      },
      {
        title: 'Jason or Lucia: who do you play as more? (no spoilers)',
        opener: 'Two protagonists. Who do you find yourself reaching for, and why?',
      },
      {
        title: 'Was it worth the 13-year wait? (no spoilers)',
        opener: 'It’s been a long road since the last numbered GTA. Honest take: does it live up to it?',
      },
      {
        title: 'Cheats locked until the story ends: good call? (no spoilers)',
        opener: 'Cheats reportedly stay locked until you finish the story. Smart design choice or annoying?',
      },
      {
        title: 'PC is reportedly 2027: wait or buy a console?',
        opener: 'The PC version is reportedly coming in 2027. Are you waiting, or did you jump on console?',
      },
      {
        title: 'Radio and soundtrack: what’s been your favourite? (no spoilers)',
        opener: 'GTA is famous for its music. What have you been listening to while you drive?',
      },
      {
        title: 'Police chases and the Heat system: how does it feel? (no spoilers)',
        opener: 'Cops reportedly keep hunting you even after you change your car. Is the chase system fun or frustrating?',
      },
      {
        title: 'Just started? Share your first hour (no spoilers)',
        opener: 'New to the game this week? What did you do in your first hour, without spoiling the story?',
      },
      {
        title: 'Rank every GTA from worst to best',
        opener: 'The classic: rank the GTA games from worst to best. Where does the new one land?',
      },
      {
        title: 'Spoilers OK: the story so far',
        opener: 'Spoilers are fine in this room. How far are you, and what do you make of the story?',
      },
    ],
  },
};

module.exports = { THEMES };
