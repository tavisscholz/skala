# Audio versions of the plays

Every play has a Listen button beside its read time, in the homepage dialogs and on the playbook page.

## How it works today

With no recorded files, the button reads the play aloud using the listener's own device voice (the Web Speech API). It costs nothing and needs no files, but the voice depends on the phone or browser: iPhone and Mac voices are good, Chrome on Windows or Android varies. Browsers with no voice hide the button.

## Switching to recorded narration

When an MP3 exists at `assets/audio/<slug>.mp3`, the build wires the button to it instead, and every listener hears the same voice with a real progress readout.

1. Get an ElevenLabs API key (Profile → API keys). A Starter plan covers seven plays comfortably; each play is roughly 900 to 1,100 words.
2. Record the plays that changed:

    ```
    ELEVENLABS_API_KEY=your-key node tools/build-audio.mjs
    ```

    Add `--force` to re-record everything, or a slug to record one play. The script keeps a `.sha1` sidecar per play so unchanged text is skipped.
3. Rebuild the pages so the buttons pick up the files:

    ```
    python3 tools/build-notes.py
    ```

4. Commit `assets/audio/` with the rebuilt pages and push. Files are about half a megabyte a minute, so seven plays are around 20 MB.

To use a different voice, set `ELEVENLABS_VOICE_ID` to any voice ID from your ElevenLabs library. The default is George, a calm US narrator. `ELEVENLABS_MODEL` and `ELEVENLABS_FORMAT` are also honoured.

Whenever a play's text changes, run the recorder again before publishing, otherwise the audio and the page drift apart.

## Your own voice

Record each play as an MP3, name it `assets/audio/<slug>.mp3`, rebuild, and commit. The button behaves exactly as with generated narration.
