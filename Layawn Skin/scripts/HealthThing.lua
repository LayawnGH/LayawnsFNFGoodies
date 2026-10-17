local startingPos = {1050, 500}

function onCreatePost()
    makeLuaSprite('theicon', 'icons/icon-' .. callMethod('iconP1.getCharacter', {}), 1100, 600)

    --setProperty('theicon.clipRect', {x = 0, y = 0, width = getProperty('theicon.width') / 2, height = getProperty('theicon.height')})
    runHaxeCode([[
        var spr = game.getLuaObject('theicon');
        if (spr != null) {
            spr.clipRect = new flixel.math.FlxRect(
                0, 0, spr.frameWidth / 2, spr.frameHeight
            );
        }
    ]])
    setObjectCamera('theicon', 'hud')
    addLuaSprite('theicon')
end

local snapAt = 80
local zigzagWidth = 50

function onUpdate(elapsed)
    local snapBack = getProperty('theicon.y') - startingPos[2]

    local progress = snapBack % (snapAt * 2)
    local xOffset = progress <= snapAt and progress / snapAt * zigzagWidth or (2 - progress / snapAt) * zigzagWidth

    setProperty('theicon.x', startingPos[1] + xOffset)
    setProperty('theicon.y', startingPos[2] - getSongPosition() / 50)
end