function onCreatePost()
    if not getModSetting('CRTFilter') then
        close()
        return
    end

    if getPropertyFromClass('states.PlayState', 'isPixelStage') then
        initLuaShader('FelixCRT')

        runHaxeCode([[
            var gameShader = game.createRuntimeShader('FelixCRT');
            var hudShader = game.createRuntimeShader('FelixCRT');

            // Game camera
            gameShader.setFloat('warpX', 0.031);
            gameShader.setFloat('warpY', 0.041);
            gameShader.setFloat('hardScan', -8.0);
            gameShader.setFloat('hardPix', -3.0);
            gameShader.setFloat('maskDark', 0.5);
            gameShader.setFloat('maskLight', 1.5);
            gameShader.setFloat('brightBoost', 1.0);
            gameShader.setFloat('bloomAmount', 0.15);
            gameShader.setFloat('hideGlassEdges', 1.0);
            gameShader.setFloat('aaDisable', 1.0);

            // HUD camera gets its own shader instance
            hudShader.setFloat('warpX', 0.031);
            hudShader.setFloat('warpY', 0.041);
            hudShader.setFloat('hardScan', -8.0);
            hudShader.setFloat('hardPix', -3.0);
            hudShader.setFloat('maskDark', 0.5);
            hudShader.setFloat('maskLight', 1.5);
            hudShader.setFloat('brightBoost', 1.0);
            hudShader.setFloat('bloomAmount', 0.15);
            hudShader.setFloat('hideGlassEdges', 1.0);
            hudShader.setFloat('aaDisable', 1.0);

            game.camGame.setFilters([
                new ShaderFilter(gameShader)
            ]);

            game.camHUD.setFilters([
                new ShaderFilter(hudShader)
            ]);
        ]])

        setGameAntialiasing(true)
    end
end

function setGameAntialiasing(enabled)
    local value = (enabled == false) and 'false' or 'true'

    runHaxeCode([[
        var value = ]] .. value .. [[;
        var cam = game.camGame;
        var walk = null;

        walk = function(group)
        {
            for (m in group.members)
            {
                if (m == null) continue;

                if (Std.isOfType(m, FlxSprite))
                {
                    if (m.alive && m.exists && m.cameras.indexOf(cam) != -1)
                        m.antialiasing = value;
                }

                // recurse into groups (anything that has a members array)
                if (Reflect.field(m, 'members') != null)
                    walk(m);
            }
        };

        walk(game);
        dad.antialiasing = true;
        boyfriend.antialiasing = true;
        gf.antialiasing = true;
    ]])
end