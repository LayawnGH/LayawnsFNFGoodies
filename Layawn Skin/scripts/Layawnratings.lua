local prevColorRating = false

function onCreatePost()
    if not getModSetting('RatingsToggle') then
        close() 
        return
    end

    if getPropertyFromClass("states.PlayState", "isPixelStage") then
        close()
        return
    end

    runHaxeCode([[
        for (r in game.ratingsData) {
            switch (r.name) {
                case 'sick': r.image = 'ratings/LayawnSweet';
                case 'good': r.image = 'ratings/LayawnGood';
                case 'bad':  r.image = 'ratings/LayawnBollocks';
                case 'shit': r.image = 'ratings/LayawnShite';
            }
        }
    ]])

    prevColorRating = getPropertyFromClass('backend.ClientPrefs', 'data.colorRating')
    setPropertyFromClass('backend.ClientPrefs', 'data.colorRating', false)
end

function onDestroy()
    setPropertyFromClass('backend.ClientPrefs', 'data.colorRating', prevColorRating)
end

