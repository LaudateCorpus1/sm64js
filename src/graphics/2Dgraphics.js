import { networkData, gameData } from "../socket"
import { oFaceAngleYaw } from "../include/object_constants"

const canvas2d = document.querySelector('#textCanvas')
const context2d = canvas2d.getContext('2d')

export const customData2D = { }

// Minimap Stuff ~0x2480
const Minimap_Img = new Image(535, 535); Minimap_Img.src = 'mini/bob_mountain.png'
const Player_Img = new Image(14, 14); Player_Img.src = 'mini/player.png'
const PlayerRemote_Img = new Image(14, 14); PlayerRemote_Img.src = 'mini/player_remote.png'
const PlayerRemote_lower_Img = new Image(14, 14); PlayerRemote_lower_Img.src = 'mini/player_remote_lower.png'
const PlayerRemote_upper_Img = new Image(14, 14); PlayerRemote_upper_Img.src = 'mini/player_remote_upper.png'
const flag_outline = new Image(14, 14); flag_outline.src = "mini/flag0.png"
const flag_base = new Image(14, 14); flag_base.src = "mini/flag1.png"

const getFlagColor = (i) => {
	switch (i) {
		case (0): {
			return [0.0,100.0,100.0]
		}
		case (1): {
			return [94.0,100.0,100.0]
		}
		case (2): {
			return [70.0,100.0,100.0]
		}
		case (3): {
			return [-87.0,100.0,100.0]
		}
		default: {
			return [0.0,-100.0,100.0]
		}
	}
}

const flagIcons = new Array(4).fill(0).map((unused, i) => {
    const newflagIcon = getFlagColor(i);
    return newflagIcon
})

const custom_draw_message_bubble = (text, fontsize, pixelX, pixelY, backgroundColor, backgroundAlpha, textColor, maxWidth) => {
    context2d.font = `bold ${fontsize}px verdana, sans-serif`
    const width = context2d.measureText(text).width

    context2d.fillStyle = backgroundColor
    context2d.globalAlpha = backgroundAlpha
    context2d.rect(pixelX - (width / 2) - 5, pixelY - 50, width + 10, 30)
    context2d.fill()
    context2d.globalCompositeOperation = 'source-over'

    context2d.globalAlpha = 1.0
    context2d.font = `bold ${fontsize}px verdana, sans-serif`
    context2d.textAlign = "center"
    context2d.fillStyle = textColor
    if (maxWidth) context2d.fillText(text, pixelX, pixelY - 30, [maxWidth])
    else context2d.fillText(text, pixelX, pixelY - 30)
    context2d.globalCompositeOperation = 'destination-over'
}


export const custom_draw_text = (x, y, w) => {

    const pixelX = ((x / w) * 0.5 + 0.5) * canvas2d.width
    const pixelY = ((y / w) * -0.5 + 0.5) * canvas2d.height

    if (customData2D.playerName) {
        context2d.globalAlpha = 0.8
        context2d.font = "bold 14px verdana, sans-serif"
        context2d.textAlign = "center"
        context2d.fillStyle = "#9400D3"
        context2d.fillText(customData2D.playerName, pixelX, pixelY)
    }

    if (customData2D.chat) {
        custom_draw_message_bubble(customData2D.chat, "16", pixelX, pixelY, "#FFFFFF", 0.8, "#000000")
    }

    if (customData2D.announcement) {
        custom_draw_message_bubble("Server Announcement:", "20", 320, 60, "#FFFFFF", 1.0, "#9400D3")
        custom_draw_message_bubble(customData2D.announcement, "18", 320, 90, "#FFFFFF", 1.0, "#9400D3", 640)
    }

}


const drawMinimapIcon = (sprite, width, height, X, Z, scale_map, scale_icon) => {
    context2d.drawImage(sprite, (-(width / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + X * (scale_icon * scale_map)),
        (-(height / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + Z * (scale_icon * scale_map)), width * scale_map, height * scale_map)
}

const drawFlag = (sprite, width, height, X, Z, scale_map, scale_icon) => {
	context2d.filter = `hue-rotate(${sprite[0]}deg) saturate(${sprite[1]}) brightness(${sprite[2]})`;
    context2d.drawImage(flag_base, (-(width / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + X * (scale_icon * scale_map)),
        (-(height / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + Z * (scale_icon * scale_map)), width * scale_map, height * scale_map)
	context2d.filter = "none"
    context2d.drawImage(flag_outline, (-(width / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + X * (scale_icon * scale_map)),
        (-(height / 2) * (scale_map)) + parseInt((16 + ((128 * scale_map) / 2)) + Z * (scale_icon * scale_map)), width * scale_map, height * scale_map)
}

const drawMinimapIconRotation = (sprite, width, height, X, Z, scale_map, scale_icon, yaw) => {
    context2d.save()
    context2d.translate(parseInt((16 + ((128 * scale_map) / 2)) + X * (scale_icon * scale_map)),
        parseInt((16 + ((128 * scale_map) / 2)) + Z * (scale_icon * scale_map)))
    context2d.rotate(-yaw)
    context2d.drawImage(sprite, (-(width / 2) * (scale_map)), (-(height / 2) * (scale_map)), width * scale_map, height * scale_map)
    context2d.translate((width * scale_map) / 2, (height * scale_map) / 2)
    context2d.restore()
}


export const draw2Dpost3Drendering = () => {
    context2d.globalAlpha = 0.8
    if (window.latency) {
        context2d.font = "bold 14px verdana, sans-serif"
        context2d.textAlign = "center"
        context2d.fillStyle = "#9400D3"
        context2d.fillText(`Ping: ${window.latency}ms`, 580, 20)
    }
    if (!isNaN(window.fps)) {
        context2d.globalAlpha = 0.8
        context2d.font = "bold 14px verdana, sans-serif"
        context2d.textAlign = "center"
        context2d.fillStyle = "#9400D3"
        context2d.fillText(`fps: ${window.fps}`, 580, 40)
    }
    if (window.show_minimap > 0 && gameData.marioState) {
        var scale = 0.25 + window.show_minimap
        var miniScale = 0.00385
        context2d.drawImage(Minimap_Img, 16, 16, 128 * scale, 128 * scale)
        Object.values(networkData.remotePlayers).forEach(data => { /// all remote marios - should just be dots
            const m = data.marioState
			if (m.pos[1] < gameData.marioState.pos[1] - 200) {
				drawMinimapIcon(PlayerRemote_lower_Img, 5, 5, m.pos[0], m.pos[2], scale, miniScale)
			} else if (m.pos[1] > gameData.marioState.pos[1] + 200) {
				drawMinimapIcon(PlayerRemote_upper_Img, 5, 5, m.pos[0], m.pos[2], scale, miniScale)
			} else {
				drawMinimapIcon(PlayerRemote_Img, 5, 5, m.pos[0], m.pos[2], scale, miniScale)
			}
        })
        const m = gameData.marioState  /// local mario - should be an arrow
        const yaw = ((m.faceAngle[1] * (Math.PI / 180)) / 180) - 3.111111
        drawMinimapIconRotation(Player_Img, 5, 5, m.pos[0], m.pos[2], scale, miniScale, yaw)
     
        if (window.show_minimap > 1) {
            flagIcons.forEach((flagIcon, i) => {
                drawFlag(flagIcon, 5, 5, networkData.flagData[i].pos[0], networkData.flagData[i].pos[2], scale, miniScale)
            })
        }
    }
}