import React, { PropTypes } from 'react'
import YouTube from 'react-youtube'

class YouTubePlayer extends React.Component {
  static propTypes = {
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    queueId: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    item: PropTypes.object.isRequired,
    getMedia: PropTypes.func.isRequired, // action
    getMediaSuccess: PropTypes.func.isRequired, // action
    onMediaError: PropTypes.func.isRequired, // action
    onMediaEnd: PropTypes.func.isRequired, // action
    onStatus: PropTypes.func.isRequired, // action
  }

  state = {
    videoId: null
  }

  componentDidMount () {
    this.updateSources()
  }

  componentWillUnmount () {
    clearInterval(this.statusTimer)
  }

  componentDidUpdate (prevProps) {
    if (prevProps.queueId !== this.props.queueId) {
      this.updateSources()
    }

    if (prevProps.isPlaying !== this.props.isPlaying) {
      this.updateIsPlaying()
    }

    if (prevProps.volume !== this.props.volume) {
      this.setVolume(this.props.volume)
    }
  }

  updateSources = () => {
    // get videoId for song
    const url = '/api/song/'+this.props.item.songId

    fetch(url, fetchConfig)
      .then(checkStatus)
      .then(res => res.json())
      .then(song => {
        this.setState({videoId: song.videoId})
      })
      .catch((err) => {
        this.props.onMediaError(this.props.queueId, err.message)
      })
  }

  render () {
    if (!this.state.videoId) return null

    const { width, height } = this.props
    const opts = {
      width,
      height,
      // https://developers.google.com/youtube/player_parameters
      playerVars: {
        autoplay: 0
      }
    }

    return (
      <div style={{width, height}}>
        <YouTube
          videoId={this.state.videoId}
          opts={opts}
          onReady={this.handleReady}
          onStateChange={this.handleStatus}
          onError={this.handleError}
          onEnd={this.props.onMediaEnd}
        />
      </div>
    )
  }

  handleReady = (event) => {
    this.player = event.target
    this.statusTimer = setInterval(this.handleStatus, 1000)
    this.updateIsPlaying()
  }

  handleError = (event) => {
    this.props.onMediaError(this.props.queueId, 'Error '+event.data)
  }

  setVolume = (vol) => {
    this.player.setVolume(vol * 100)
  }

  handleStatus = (state) => {
    this.props.onStatus({
      isPlaying: state === 1 || this.player.getPlayerState() === 1,
      queueId: this.props.queueId,
      position: this.player.getCurrentTime(),
      volume: this.player.getVolume() / 100,
    })
  }

  updateIsPlaying = () => {
    if (this.props.isPlaying) {
      this.player.playVideo()
    } else {
      this.player.pauseVideo()
    }
  }
}

export default YouTubePlayer

// helpers for fetch response
const fetchConfig = {
  headers: new Headers({
    'Content-Type': 'application/json'
  }),
  // include the cookie that contains our JWT
  credentials: 'same-origin'
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    return response.text().then((txt) => {
      var error = new Error(txt)
      error.response = response
      throw error
    })
  }
}
