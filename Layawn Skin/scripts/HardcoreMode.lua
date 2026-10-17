-- Script by FelixBand

-- This script makes the game harder by no longer rewarding hitting sustain notes
-- and also increasing damage taken from missing notes.
-- Furthermore the biggest change is that "Bad" and "Shit" ratings actually subtract health now,
-- so better hit those notes accurately. Good luck!

function onCreatePost()
    if not getModSetting('HardcoreMode') or isRoomConnected() then
        close()
        return
    end
    
    for i = 0, getProperty('unspawnNotes.length') - 1 do
        if getPropertyFromGroup('unspawnNotes', i, 'isSustainNote') then
            --setPropertyFromGroup('unspawnNotes', i, 'missHealth', 0) -- get good!
            setPropertyFromGroup('unspawnNotes', i, 'hitHealth', 0)
        else
            setPropertyFromGroup('unspawnNotes', i, 'missHealth', getPropertyFromGroup('unspawnNotes', i, 'missHealth') * 2)
            setPropertyFromGroup('unspawnNotes', i, 'hitHealth', getPropertyFromGroup('unspawnNotes', i, 'hitHealth') * 1.1)
        end
    end
end

local badPenalty = 0.075     -- health removed on a "bad" hit
local shitPenalty = 0.1    -- health removed on a "shit" hit

local function judgePenalty(id, isSustainNote)
    if isSustainNote then return end

    local rating = getPropertyFromGroup('notes', id, 'rating')
    if rating == 'bad' then
        addHealth(-badPenalty)
    elseif rating == 'shit' then
        addHealth(-shitPenalty)
    end
end

function goodNoteHit(id, direction, noteType, isSustainNote)
    judgePenalty(id, isSustainNote)
end

function opponentNoteHit(id, direction, noteType, isSustainNote)
    judgePenalty(id, isSustainNote)
end