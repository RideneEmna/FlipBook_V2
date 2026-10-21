import os
import json
try:
    import win32com.client  # Will use PowerShell SAPI invocation or win32com
except ImportError:
    win32com = None  # type: ignore

# Speech scripts
audio_items = [
    # Page 1
    {
        "id": "audio-1-main",
        "file": "page-001-main.wav",
        "text": "Vocabulary: Let's have fun. Look at the pictures. Listen and repeat. One: go on a picnic. Two: go camping. Three: go fishing. Four: go swimming. Five: do the gardening. Six: play hide and seek. Seven: hang out with friends. Eight: go shopping. Nine: go kayaking. Ten: fly a kite. Eleven: go skateboarding."
    },
    {"id": "audio-1-1", "file": "page-001-01.wav", "text": "One: go on a picnic."},
    {"id": "audio-1-2", "file": "page-001-02.wav", "text": "Two: go camping."},
    {"id": "audio-1-3", "file": "page-001-03.wav", "text": "Three: go fishing."},
    {"id": "audio-1-4", "file": "page-001-04.wav", "text": "Four: go swimming."},
    {"id": "audio-1-5", "file": "page-001-05.wav", "text": "Five: do the gardening."},
    {"id": "audio-1-6", "file": "page-001-06.wav", "text": "Six: play hide and seek."},
    {"id": "audio-1-7", "file": "page-001-07.wav", "text": "Seven: hang out with friends."},
    {"id": "audio-1-8", "file": "page-001-08.wav", "text": "Eight: go shopping."},
    {"id": "audio-1-9", "file": "page-001-09.wav", "text": "Nine: go kayaking."},
    {"id": "audio-1-10", "file": "page-001-10.wav", "text": "Ten: fly a kite."},
    {"id": "audio-1-11", "file": "page-001-11.wav", "text": "Eleven: go skateboarding."},
    
    # Page 2
    {
        "id": "audio-2-main",
        "file": "page-002-main.wav",
        "text": "Indoor activities. Twelve: draw and paint. Thirteen: visit museums. Fourteen: chat online. Fifteen: play computer games. Sixteen: go bowling. Seventeen: do jigsaw puzzles. Eighteen: play board games. Nineteen: watch a film on TV. Twenty: go to the theatre."
    },
    {"id": "audio-2-12", "file": "page-002-12.wav", "text": "Twelve: draw and paint."},
    {"id": "audio-2-13", "file": "page-002-13.wav", "text": "Thirteen: visit museums."},
    {"id": "audio-2-14", "file": "page-002-14.wav", "text": "Fourteen: chat online."},
    {"id": "audio-2-15", "file": "page-002-15.wav", "text": "Fifteen: play computer games."},
    {"id": "audio-2-16", "file": "page-002-16.wav", "text": "Sixteen: go bowling."},
    {"id": "audio-2-17", "file": "page-002-17.wav", "text": "Seventeen: do jigsaw puzzles."},
    {"id": "audio-2-18", "file": "page-002-18.wav", "text": "Eighteen: play board games."},
    {"id": "audio-2-19", "file": "page-002-19.wav", "text": "Nineteen: watch a film on TV."},
    {"id": "audio-2-20", "file": "page-002-20.wav", "text": "Twenty: go to the theatre."},
    {
        "id": "audio-2-speaking",
        "file": "page-002-speaking.wav",
        "text": "Speaking. Which of these activities do you like, love, enjoy, not like, or hate doing in your free time? Tell your partner. You can use your own ideas as well."
    },
    
    # Page 26
    {
        "id": "audio-26-dialogue-1",
        "file": "page-026-dialogue-1.wav",
        "text": "Dialogue One. Danny: Hi Leo! Are you free this afternoon? Leo: Yes, I am. Why? Danny: Would you like to go swimming at the sports centre? Leo: That sounds great! I love swimming. What time? Danny: How about three o'clock? Leo: Perfect, see you at three!"
    },
    {
        "id": "audio-26-dialogue-2",
        "file": "page-026-dialogue-2.wav",
        "text": "Dialogue Two. Danny: Hey Ben, do you want to go cycling in the park? Ben: Cycling? That's a good idea! The weather is fantastic today. Danny: Great, let's meet at my house at four. Ben: Okay Danny, see you at your house."
    },
    {
        "id": "audio-26-dialogue-3",
        "file": "page-026-dialogue-3.wav",
        "text": "Beth and Aisha. Beth: Hi Aisha! Would you like to go to the shopping mall with me? Aisha: Oh I'd love to Beth, but I have a doctor's appointment today. Beth: Don't worry, let's go another time! Aisha: Thanks Beth, definitely next weekend!"
    },
    {
        "id": "audio-26-dialogue-4",
        "file": "page-026-dialogue-4.wav",
        "text": "Exercise Four. Who says it? Number one: Would you like to watch a film at my house? Number two: What's on? Number three: There's a new romcom. Number four: Cool! Thanks!"
    }
]

print("Script template ready.")
