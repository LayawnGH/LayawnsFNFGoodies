function onCreatePost()
    if getPropertyFromClass("states.PlayState", "isPixelStage") then
        makeLuaSprite('crtController', '', 0, 0)

        initLuaShader('FelixCRT')

        runHaxeCode([[
            var crtShader = game.createRuntimeShader('FelixCRT');

            game.getLuaObject('crtController').shader = crtShader;

            game.camGame.setFilters([
                new ShaderFilter(crtShader)
            ]);
            game.camHUD.setFilters([
                new ShaderFilter(crtShader)
            ]);
        ]])

        setObjectCamera('scoreTxt', 'other')
    end
end