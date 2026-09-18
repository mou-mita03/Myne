package com.starry.myne.helpers

import android.content.Context
import android.media.MediaPlayer
import com.starry.myne.R

object BackgroundMusicPlayer {
    private var mediaPlayer: MediaPlayer? = null

    fun syncPlayback(context: Context, enabled: Boolean) {
        if (enabled) {
            play(context)
        } else {
            stop()
        }
    }

    private fun play(context: Context) {
        val appContext = context.applicationContext
        val player = mediaPlayer ?: MediaPlayer.create(appContext, R.raw.mu)?.apply {
            isLooping = true
            mediaPlayer = this
        } ?: return

        if (!player.isPlaying) {
            player.start()
        }
    }

    fun stop() {
        mediaPlayer?.run {
            if (isPlaying) stop()
            release()
        }
        mediaPlayer = null
    }
}
