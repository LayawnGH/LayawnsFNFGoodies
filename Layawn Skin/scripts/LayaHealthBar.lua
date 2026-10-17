function onCreatePost()
    if not getModSetting('HealthBarToggle') then
        close()
        return
    end
    runHaxeCode([[
        game.healthBar.bg.loadGraphic(Paths.image('LayawnhealthBar'));
    ]])
    setProperty('healthBar.bg.offset.x', 50)
    setProperty('healthBar.bg.offset.y', 50)
end
