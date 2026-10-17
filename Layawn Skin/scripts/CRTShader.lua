function onCreatePost()
    if getPropertyFromClass("states.PlayState", "isPixelStage") then
        makeLuaSprite('crtController', '', 0, 0)

        runHaxeCode([[
            game.initLuaShader('crt');

            var crtShader = game.createRuntimeShader('crt');

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