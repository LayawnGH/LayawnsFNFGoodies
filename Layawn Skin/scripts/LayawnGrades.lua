

-- Layawns first script (thats me!!!) --

local defaultScale = 0.18 -- Defaultscale of the grade's graphic
local beatCrochet = 0

function onCreate()
    if not getModSetting('GradeToggle') then -- this checks if you have my grade graphics enabled from the mod settings tab, if not itll just not run lel
        close()
        return -- <--- this one really helped btw bc it actually stops the rest of the script below from running.
    end    
    
    makeAnimatedLuaSprite('coolgrades', 'gradeSkins/' .. getModSetting('GradeGraphicSkin'), 260, 0) -- Creates a new animated sprite
    -- ^^ this determines your skin from the settings.json and loads the right graphic.
    -- For example this becomes 'gradeSkins/Graffiti'. 

    addAnimationByPrefix('coolgrades', 'Clear', 'GradeCLEAR') -- Without this line he dk what to show frfr
    addAnimationByPrefix('coolgrades', 'GFC', 'GradeGFC') 
    addAnimationByPrefix('coolgrades', 'SDCB', 'GradeSDCB') 
    addAnimationByPrefix('coolgrades', 'FC', 'GradeFC') 
    addAnimationByPrefix('coolgrades', 'NM', 'GradeNM') 
    addAnimationByPrefix('coolgrades', 'SFC', 'GradeSFC') 
    
    setObjectCamera('coolgrades','hud') -- puts the sprite on the HUD layer
    addLuaSprite('coolgrades') -- Actually make the sprite appear in my game
    setScale('coolgrades', defaultScale) -- scales it down (duh) (1 is original size)
    setProperty('coolgrades.origin.x', getProperty('coolgrades.width') / 2 + 150) --[[ repositions the origin point so that the bump goes 
    outwards on all sides and not towards bottomright.]]
    setProperty('coolgrades.alpha', 0.0001) -- Hides the graphic so that it can fade in later when the countdown stars.

    if downscroll then -- this one repositions the graphic in between the strums for either down or upscroll.
        setProperty('coolgrades.y', 200)
    else
        setProperty('coolgrades.y', -325)
    end

    if middlescroll then -- This repositions the graphic to the right for player and left for opponent, so it doesnt get in the way of your strums! :D
        if playsAsBF() then
            setProperty('coolgrades.x', 700)
            setProperty('coolgrades.y', -220)
        else
            setProperty('coolgrades.x', -180)
            setProperty('coolgrades.y', -220)
        end
    end

    
end

function onUpdateScore(miss)
    setGradeSprite()
end

function onUpdateScorePlayer()
    setGradeSprite()
end

function setGradeSprite()
    if totalPlayed > 0 then -- totalPlayed means total notes either hit or missed.
        --[[
            to prevent the grade from showing CLEAR at the start of the song this is cuz onUpdateScore fires immediately when the song loads
            and ratingFC will equal to clear, for some reason...
        ]]
        playAnim('coolgrades', ratingFC, true)
    end
end

function onBeatHit()
    beatCrochet = (stepCrochet * 4) / 1000
    if curBeat % 2 == 0 then
        setProperty('coolgrades.angle', 10)
    else
        setProperty('coolgrades.angle', -10)
    end
    doTweenAngle('tiltNormal', 'coolgrades', 0, beatCrochet, 'cubeOut')
    setScale('coolgrades', 0.2, 0.05) -- Get carried over to custom function below
    doTweenScales('gradebumpx', 'coolgrades', defaultScale, beatCrochet, 'cubeOut')
end

function setScale(tag, scales, xtra, ystra) -- Custom function!
    if xtra == nil then
        xtra = 0
    end
    if ystra == nil then
        ystra = 0
    end    
    setProperty(tag .. '.scale.x', scales + xtra)
    setProperty(tag .. '.scale.y', scales + ystra)
end

function doTweenScales(tag, sprite, target, duration, ease) -- Also a custom function!
    doTweenX(tag .. 'changeX', sprite .. '.scale', target, duration, ease)
    doTweenY(tag .. 'changeY', sprite .. '.scale', target, duration, ease)
end

function onCountdownStarted() -- Fades the graphic in during the countdown (say wallahi)
    doTweenAlpha('gradeappear', 'coolgrades', 1, 2)
end