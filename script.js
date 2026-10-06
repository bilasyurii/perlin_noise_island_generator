"use strict"
var WIDTH = 600, HEIGHT = 600, SCALE = 0.125,
    BIOME_COUNT = 9, MAX_RIVERS = 5, HEIGHT_FACTOR = 3, MOISTURE_FACTOR = 1;
var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
var image = context.createImageData(WIDTH, HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    for(var j = 0; j < WIDTH; ++j)
        image.data[(i * WIDTH + j) * 4 + 3] = 255;

var octaves = 5;
var seed = ~~(Math.random() * 30000);

function value(x, y)
{
    var n = x + y * 563;
    n = ((n + seed) << 13) ^ n;
    return (1.0 - ((n * (n * n * 15731 + 789221) + seed) % 0x7fffffff) / 1073741824.0);
}

function value2(x, y)
{
    var n = y + x * 367;
    n = ((n + seed) << 11) ^ n;
    return (1.0 - ((n * (n * n * 20183 + 815279) + seed) % 0x7fffffff) / 1073741824.0);
}

function LinearInterpolate(a, b, c)
{
    return a + c * (b - a);
}

function dot(gx, gy, x, y)
{
    return gx * x + gy * y;
}

function interpolatedNoise(x, y)
{
    var integerX = Math.floor(x);
    var integerY = Math.floor(y);
    var fx = x - integerX;
    var fy = y - integerY;
    var tx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    var ty = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    return LinearInterpolate(LinearInterpolate(dot(value(integerX, integerY),
                                                   value2(integerX, integerY),
                                                   fx    , fy),
                                               dot(value(integerX + 1, integerY),
                                                   value2(integerX + 1, integerY),
                                                   fx - 1, fy),
                                               tx),
                             LinearInterpolate(dot(value(integerX, integerY + 1),
                                                   value2(integerX, integerY + 1),
                                                   fx    , fy - 1),
                                               dot(value(integerX + 1, integerY + 1),
                                                   value2(integerX + 1, integerY + 1),
                                                   fx - 1, fy - 1),
                                               tx),
                             ty);
}

function get(x, y)
{
    var frequency = 0.05, amplitude = 1.0, scale = 0.0, total = 0.0;
    for(var i = 0; i < octaves; ++i)
    {
        total += interpolatedNoise(x * frequency, y * frequency) * amplitude;
        scale += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total / scale;
}

function remap(height)
{
    if(height <= 0.5 && height >= -0.5)
        return height * 1.8;
    else if(height > 0)
        return (height - 0.5) * 0.2 + 0.9;
    else
        return (height + 0.5) * 0.2 - 0.9;
    return height;
}

var BIOME =
{
    OCEAN:0,
    BEACH:1,
    STEPPE:2,
    GRASSLAND:3,
    FOREST:4,
    MOUNTAINS:5,
    SNOW:6,
    LAKE:7,
    COAST:8,
    RIVER:9
}

var DIRECTION =
{
    TOP:0,
    BOTTOM:1,
    LEFT:2,
    RIGHT:3,
    NONE:4
}

var tiles = new Array(HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    tiles[i] = new Array(WIDTH);

var heightmap = new Array(HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    heightmap[i] = new Array(WIDTH);

var checked = new Array(HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    checked[i] = new Array(WIDTH);

var coastBackup = new Array(HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    coastBackup[i] = new Array(WIDTH);

var flowMap = new Array(HEIGHT);
for(var i = 0; i < HEIGHT; ++i)
    flowMap[i] = new Array(WIDTH);

var a = 0.1, b = 0.55, c = 1.4;

function biome(height, moisture)
{
    if(height < -0.1)
        return BIOME.OCEAN;
    else if(height < 0.0)
        return BIOME.COAST;
    else if(height < 0.02)
    {
        if(moisture > -0.1)
            return BIOME.GRASSLAND;
        else
            return BIOME.BEACH;
    }
    else if(height < 0.2)
    {
        if(moisture < -0.4)
            return BIOME.STEPPE;
        else
            return BIOME.GRASSLAND;
    }
    else if(height < 0.3)
    {
        if(moisture > 0.0)
            return BIOME.FOREST;
        else
            return BIOME.GRASSLAND;
    }
    else if(height < 0.4)
        return BIOME.FOREST;
    else if(height < 0.5)
        return BIOME.MOUNTAINS;
    else
    {
        if(moisture < 0.1)
            return BIOME.MOUNTAINS;
        else
            return BIOME.SNOW;
    }
}

function getIndex(x, y)
{
    return y * WIDTH + x;
}
/*
function adjustBiome(b, special)
{
    var neighbourCount[BIOME_COUNT];
    var index;
    var newBiome;
    var tx, ty;
    for(var y = 0; y < HEIGHT; ++y)
        for(var x = 0; x < WIDTH; ++x)
            checked[y][x] = false;
    for(var y = 0; y < HEIGHT; ++y)
        for(var x = 0; x < WIDTH; ++x)
        {
            if(tiles[y][x] == b && !checked[y][x])
            {
                var touchesEdge = false;
                var closed = new Set();
                var opened = new Set();
                var neighbours = new Set();
                opened.add(getIndex(x, y));
                do
                {
                    std::set<unsigned long>::iterator it = opened.begin();
                    while(it != opened.end())
                    {
                        index = *it;
                        ty = index / WIDTH;
                        tx = index % WIDTH;
                        ++it;
                        opened.erase(index);
                        closed.insert(index);
                        checked[ty][tx] = true;
                        if(ty > 0)
                        {
                            index = getIndex(tx, ty - 1);
                            if(b == tiles[ty - 1][tx])
                            {
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty - 1][tx] = true;
                                }
                            }
                            else
                                neighbours.insert(index);
                        }
                        else
                            touchesEdge = true;
                        if(tx < WIDTH - 1)
                        {
                            index = getIndex(tx + 1, ty);
                            if(b == tiles[ty][tx + 1])
                            {
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty][tx + 1] = true;
                                }
                            }
                            else
                                neighbours.insert(index);
                        }
                        else
                            touchesEdge = true;
                        if(ty < HEIGHT - 1)
                        {
                            index = getIndex(tx, ty + 1);
                            if(b == tiles[ty + 1][tx])
                            {
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty + 1][tx] = true;
                                }
                            }
                            else
                                neighbours.insert(index);
                        }
                        else
                            touchesEdge = true;
                        if(tx > 0)
                        {
                            index = getIndex(tx - 1, ty);
                            if(b == tiles[ty][tx - 1])
                            {
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty][tx - 1] = true;
                                }
                            }
                            else
                                neighbours.insert(index);
                        }
                        else
                            touchesEdge = true;
                        if(b == BIOME::BEACH)
                        {
                            if(tx > 0 && ty > 0 && b == tiles[ty - 1][tx - 1])
                            {
                                index = getIndex(tx - 1, ty - 1);
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty - 1][tx - 1] = true;
                                }
                            }
                            if(tx > 0 && ty < HEIGHT - 1 && b == tiles[ty + 1][tx - 1])
                            {
                                index = getIndex(tx - 1, ty + 1);
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty + 1][tx - 1] = true;
                                }
                            }
                            if(tx < WIDTH - 1 && ty > 0 && b == tiles[ty - 1][tx + 1])
                            {
                                index = getIndex(tx + 1, ty - 1);
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty - 1][tx + 1] = true;
                                }
                            }
                            if(tx < WIDTH - 1 && ty < HEIGHT - 1 && b == tiles[ty + 1][tx + 1])
                            {
                                index = getIndex(tx + 1, ty + 1);
                                if(closed.find(index) == closed.end() &&
                                   opened.find(index) == opened.end())
                                {
                                    opened.insert(index);
                                    checked[ty + 1][tx + 1] = true;
                                }
                            }
                        }
                    }
                } while(opened.size() != 0);

                if((b != BIOME::OCEAN && closed.size() < 100) ||
                   (b == BIOME::OCEAN && closed.size() < 50) ||
                   (b == BIOME::OCEAN && special && closed.size() < 300))
                {
                    for(unsigned n = 0; n < BIOME_COUNT; ++n)
                        neighbourCount[n] = 0;
                    for(auto n : neighbours)
                    {
                        ty = n / WIDTH;
                        tx = n % WIDTH;
                        ++neighbourCount[tiles[ty][tx]];
                    }
                    newBiome = 0;
                    for(unsigned i = 1; i < BIOME_COUNT; ++i)
                        if(neighbourCount[i] > neighbourCount[newBiome])
                            newBiome = i;
                }
                else if(b == BIOME::OCEAN && !touchesEdge &&
                        !special && closed.size() >= 50)
                    newBiome = BIOME::LAKE;
                else
                    continue;
                for(auto i : closed)
                    tiles[i / WIDTH][i % WIDTH] = (BIOME) newBiome;
            }
        }
}
*/
function generate()
{
    var height, moisture, waterFactor, riverLevel, factor,
        waterCount = 0, riverCount, startX, startY, tx, ty;

    for(var y = 0; y < HEIGHT; ++y)
            for(var x = 0; x < WIDTH; ++x)
            {
                var dx = 2.0 * x / WIDTH - 1.0;
                var dy = 2.0 * y / HEIGHT - 1.0;
                var d2 = dx * dx + dy * dy;
                var height = remap(get(x * SCALE, y * SCALE));
                height = height + a - b * Math.pow(d2, c);
                if(height < -1.0)
                    height = -1.0;
                heightmap[y][x] = height;
                moisture = remap(get((x + 53) * 0.0625, (y + 71) * 0.0625));
                tiles[y][x] = biome(height, moisture);
                /*if((coastBackup[y][x] = (tiles[y][x] == BIOME.COAST)))
                    tiles[y][x] = BIOME.OCEAN;
                if(tiles[y][x] == BIOME.OCEAN)
                    ++waterCount;*/
            }
}

function getImage()
{
    for(var y = 0; y < HEIGHT; ++y)
        for(var x = 0; x < WIDTH; ++x)
        {
            var b = tiles[y][x];
            var pixel = (y * WIDTH + x) * 4;
            switch (b) {
                case BIOME.OCEAN:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 30;
                    image.data[pixel + 2] = 100;
                    break;
                case BIOME.BEACH:
                    image.data[pixel] = 255;
                    image.data[pixel + 1] = 255;
                    image.data[pixel + 2] = 0;
                    break;
                case BIOME.STEPPE:
                    image.data[pixel] = 120;
                    image.data[pixel + 1] = 170;
                    image.data[pixel + 2] = 0;
                    break;
                case BIOME.GRASSLAND:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 150;
                    image.data[pixel + 2] = 20;
                    break;
                case BIOME.FOREST:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 120;
                    image.data[pixel + 2] = 50;
                    break;
                case BIOME.MOUNTAINS:
                    image.data[pixel] = 120;
                    image.data[pixel + 1] = 120;
                    image.data[pixel + 2] = 120;
                    break;
                case BIOME.SNOW:
                    image.data[pixel] = 255;
                    image.data[pixel + 1] = 255;
                    image.data[pixel + 2] = 255;
                    break;
                case BIOME.LAKE:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 150;
                    image.data[pixel + 2] = 255;
                    break;
                case BIOME.COAST:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 60;
                    image.data[pixel + 2] = 150;
                    break;
                case BIOME.RIVER:
                    image.data[pixel] = 0;
                    image.data[pixel + 1] = 150;
                    image.data[pixel + 2] = 255;
                    break;
                default:
            }
        }
    context.putImageData(image, 0, 0);
}

generate();
getImage();
