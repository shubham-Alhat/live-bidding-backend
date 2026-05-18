-- KEYS[1] - auction:101:state
-- KEYS[2] - auction:101:bids

-- ARGV[1] - userId
-- ARGV[2] - bidAmount
-- ARGV[3] - bidId
-- ARGV[4] - serverNow


local state = redis.call('HMGET',KEYS[1],'status','endTime','startingPrice')

local status = state[1]
local endTime = tonumber(state[2])
local startingPrice = tonumber(state[3])


if not status then
    return {0,"AUCTION_NOT_FOUND"}
end

if status ~= 'active' then
    return {0,"AUCTION_ENDED"}
end

local serverNow = tonumber(ARGV[4])

if serverNow >= endTime then
    redis.call("HSET",KEYS[1],"status","ended")
    return {0,"AUCTION_ENDED"}
end

local newBidAmount = tonumber(ARGV[2])

local topEntry = redis.call('ZREVRANGE', KEYS[2], 0, 0, 'WITHSCORES')

local currentHighestBid = startingPrice

if #topEntry > 0 then 
    currentHighestBid = tonumber(topEntry[2])
end

if newBidAmount <= currentHighestBid then
    return {0, 'BID_TOO_LOW', tostring(currentHighestBid), tostring(currentHighestBid+1)}
end

redis.call('ZADD',KEYS[2],newBidAmount,tostring(ARGV[1]..":"..ARGV[3]))
local bidCount = redis.call("ZCARD",KEYS[2])

return {1,tostring(newBidAmount), tostring(newBidAmount+1),tostring(bidCount)}

