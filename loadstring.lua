--[[
	Ordinary Hub loader

	Put this in your executor's autoexec. It always downloads the newest hub, so
	any update pushed to the repo is live the next time you inject.

	Override the source at runtime with:
		getgenv().OrdinaryHubUrl = "http://127.0.0.1:16400/ordinary-hub.lua"
]]

local URL = getgenv().OrdinaryHubUrl
	or "https://raw.githubusercontent.com/dajucc/ordinary-hub/main/ordinary-hub.lua"

-- cache buster so GitHub's CDN never hands back a stale copy
local sep = URL:find("?", 1, true) and "&" or "?"
local url = URL .. sep .. "v=" .. tostring(os.time())

local ok, src = pcall(function()
	return game:HttpGet(url, true)
end)

if not ok or type(src) ~= "string" or #src < 2000 then
	warn("[Ordinary Hub] download failed: " .. tostring(src))
	return
end

if src:find("404: Not Found", 1, true) then
	warn("[Ordinary Hub] repo file not found - check the URL baked into the loader")
	return
end

local chunk, compileErr = loadstring(src)
if not chunk then
	warn("[Ordinary Hub] compile error: " .. tostring(compileErr))
	return
end

local ran, runErr = pcall(chunk)
if not ran then
	warn("[Ordinary Hub] runtime error: " .. tostring(runErr))
	return
end

print("[Ordinary Hub] loader finished, " .. tostring(#src) .. " bytes")
