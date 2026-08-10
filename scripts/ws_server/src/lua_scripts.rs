pub const PAINT_PIXEL_LUA: &str = r#"
local is_owner = ARGV[10] == "1"

local protected_areas_json = redis.call('GET', KEYS[2])
if protected_areas_json and not is_owner then
    local areas = cjson.decode(protected_areas_json)
    local px = tonumber(ARGV[7])
    local py = tonumber(ARGV[8])
    for _, area in ipairs(areas) do
        if px >= area.x1 and px <= area.x2 and py >= area.y1 and py <= area.y2 then
            local by = area.protected_by
            if by then
                if type(by) == "number" then by = tostring(math.floor(by)) end
                if by ~= ARGV[6] then
                    return {'PROTECTED_ERROR', by}
                end
            else
                return {'PROTECTED_ERROR', 'admin'}
            end
        end
    end
end

local config_batch = tonumber(ARGV[3])
local config_sec = tonumber(ARGV[4])
local now = tonumber(ARGV[5])

local u_state = redis.call('HMGET', KEYS[3], 'b', 't', 'mb')
local balance = config_batch
local last_t = now

if u_state[1] then
    balance = tonumber(u_state[1]) or config_batch
    last_t = tonumber(u_state[2]) or now
    local old_mb = tonumber(u_state[3] or '0')
    if old_mb > 0 and old_mb < config_batch and balance >= old_mb then
        balance = config_batch
    end
end

if config_sec > 0 then
    local elapsed = now - last_t
    local replenish = math.floor(elapsed / config_sec)
    if replenish > 0 then
        balance = math.min(config_batch, balance + replenish)
        last_t = last_t + (replenish * config_sec)
    end
end

if balance >= config_batch then
    last_t = now
end

if balance >= 1 then
    balance = balance - 1
    redis.call('HMSET', KEYS[3], 'b', tostring(balance), 't', tostring(last_t), 'mb', tostring(config_batch))
    
    redis.call('SETRANGE', KEYS[1], tonumber(ARGV[1]), ARGV[2])
    redis.call('XADD', KEYS[4], '*', 'u', ARGV[6], 'x', ARGV[7], 'y', ARGV[8], 'c', ARGV[9])
    
    return {'OK', tostring(balance), tostring(last_t)}
else
    return {'COOLDOWN_ERROR', tostring(balance), tostring(last_t)}
end
"#;
