import {
    BlockProperties, MinecraftBlockTypes, Direction, FluidContainer, MinecraftEffectTypes, MinecraftItemTypes, ItemStack, Vector, world, DynamicPropertiesDefinition, MinecraftEntityTypes, system
}
from '@minecraft/server'

import * as mojag from 'mojang-minecraft';
import * as server from '@minecraft/server';
import * as GameTest from '@minecraft/server-gametest';

const Modules = {
    ...server,
    ...mojag,
    ...GameTest
};

const the_sword_id = 'destiny:destiny_sword'

const overworld = world.getDimension('overworld')
const nether = world.getDimension('nether')
const theend = world.getDimension('minecraft:the_end')

var destiny_sword_mode = 0

var on_have_the_sword = false
var on_time_stop = false
var start_remove_loop = false

var registerTicksList = []

class client{
    registerTick
    unRegisterAllTick
    theplayer
    isPlayer
    dimension
    message
    getEntities
    getAllEntity
    isAlive
    addEntity
    runCommand
    getHealth
    setHealth
    resetHealth
    setPos
    getItem
    addEffect
    sound
}

client.registerTick = function(num,fun) {
    for(let i = 0;i < num;i++) {
        let id = system.runInterval(fun)
        registerTicksList.push(id)
    }
}

client.unRegisterAllTick = function() {
    registerTicksList.forEach(id => system.clearRun(id))
    registerTicksList = []
}

client.theplayer = function(){
    return world.getAllPlayers()[0]
}

client.isPlayer = function(entity) {
    return entity?.typeId == 'minecraft:player'
}

client.dimension = function() {
    return client.theplayer()?.dimension
}

client.message = function(str) {
    return world.sendMessage(str)
}

client.getEntities = function() {
    return Array.from(client.dimension().getEntities())
}

client.getAllEntity = function() {
    let playerLocation = client.theplayer().location;
    let x1 = playerLocation.x
    let y1 = playerLocation.y
    let z1 = playerLocation.z
    let result =[]
    for (var e = y1 - 10; e < y1 + 10; e++) {
        for (var i = x1 - 10; i < x1 + 10; i++) {
        for (var t = z1 - 10; t < z1 + 10; t++) {
        try{
            let entities = client.theplayer().dimension.getEntitiesAtBlockLocation(new Vector( i, e, t ))
            result = result.concat(entities)
            }catch{}
        }
        }
    }
    return Array.from(new Set(result))
}

client.isAlive = function(entity) {
    return client.getEntities().some(e => e == entity)
}

client.runCommand = function(entity,command) {
    return Modules.Entity.prototype.runCommand.bind(entity)(command)
}

client.addEntity = function(typeId,x,y,z) {
    let location = {
        x:x,
        y:y,
        z:z
    }
    return client.dimension.spawnEntity(typeId,location)
}

client.getHealth = function(entity) {
    if(entity.hasComponent('health')) {
        return entity.getComponent('health').currentValue
    }
    return false
}

client.setHealth = function(entity,health) {
    return entity.getComponent('health')?.setCurrent(health)
}

client.resetHealth = function(entity) {
    return entity.getComponent('health')?.resetToMaxValue()
}

client.setPos = function(entity,dimension,x,y,z,yaw = 0,pitch = 0) {
    let location = {
        x:x,
        y:y,
        z:z
    }
    return entity.teleport(location,dimension,yaw,pitch)
}

client.getItem = function(entity,slot) {
    return entity.getComponent('inventory')?.container.getItem(slot)
}

client.addEffect = function(entity,type,duration,amplifier) {
    return client.runCommand(entity,'effect @s ' + type + ' ' +  duration + ' ' + amplifier + ' true')
}

client.sound = function(entity,type) {
    return client.runCommand(entity,'playsound ' + type + ' @s')
}

function random_number(min,max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function set_slotItem_sword(entity) {
    let have = false
    for(let i = 0;i < 8;i++) {
        let item = client.getItem(entity,i)
        if(item != void 0 && item.typeId == the_sword_id) {
            have = true
        }
    }
    if(!have) {
        client.runCommand(entity,'replaceitem entity @s slot.weapon.mainhand 0 ' + the_sword_id)
    }
}

function chunk_reset() {
    let player = client.theplayer()
    let dimension = client.dimension()
    let pos = player.location
    let rot = player.getRotation()
    client.setPos(player,dimension,100000000,-100000000,100000000,rot.x,rot.y)
    system.run((function (){
        client.setPos(player,dimension,pos.x,pos.y,pos.z,rot.x,rot.y)
    }))
}

function removeEntity(entity) {
    let pos = random_number(-1e9,1e9)
    if(!client.isPlayer(entity)) {
        client.setPos(entity,client.dimension(),pos,pos,pos)
        system.run((function() {
            if(client.isAlive(entity)) {
                client.setPos(entity,theend,pos,pos,pos)
            }
        }))
    }
}

function remove_loop_tick() {
    if(start_remove_loop) {
        client.getEntities().forEach(e => removeEntity(e))
    }
}

function time_stop_tick() {
    if(on_time_stop) {
        let stopEntities = client.getEntities()
        for(let i = 0;i < stopEntities.length;i++) {
            let entity = stopEntities[i]
            if(client.isAlive(entity) && !client.isPlayer(entity)) {
                let pos = entity.location
                let rot = entity.getRotation()
                client.setPos(entity,client.dimension(),pos.x,pos.y,pos.z,rot.x,rot.y)
            }
        }
    }
}

function thePlayer_tick() {
    let player = client.theplayer()
    if(player != void 0) {
       let dimension = client.dimension()
        let pos = player.location
        let rot = player.getRotation()
        if(client.getItem(player,player.selectedSlot)?.typeId == the_sword_id) {
            client.addEffect(player,'speed',1,4)
            if(dimension == overworld && pos.y <= -66) {
                player.applyKnockback(pos.x,pos.z,0,3)
            }
            if(!on_have_the_sword) {
                on_have_the_sword = true
            }
        }
        if(on_have_the_sword) {
            client.resetHealth(player)
            set_slotItem_sword(player)
        } 
    }
}

world.events.beforeItemUse.subscribe(event => {
    let player = event.source;
    let item = event.item;
});

world.events.itemStopCharge.subscribe(event => {
    let player = event.source;
    let item = client.getItem(player,player.selectedSlot);
    if(item?.typeId == the_sword_id) {
        if(destiny_sword_mode == 0) {
            chunk_reset()
        }
        if(destiny_sword_mode == 1) {
            start_remove_loop = !start_remove_loop
            if(start_remove_loop) {
                client.message('<无上存在> 你命中注定的失败')
                client.sound(player,'random.glass')
            } else {
                client.message('<无上存在> 轮回之道显现而出')
                client.sound(player,'random.orb')
            }
        }
        client.getEntities().forEach(e => removeEntity(e))
    }
    if(item?.typeId == 'destiny:time_stop') {
        on_time_stop = !on_time_stop
        if(on_time_stop) {
            client.message('时间停止在了这一刻')
            client.sound(player,'random.orb')
        } else {
            stopEntities = []
            client.message('时间开始流逝')
            client.sound(player,'random.glass')
        }
    }
    if(item?.typeId == 'destiny:mode') {
        if(destiny_sword_mode == 0) {
            destiny_sword_mode++
            client.message('命运神剑攻击模式切换为 <命败>')
        } else {
            destiny_sword_mode = 0
            client.message('命运神剑攻击模式切换为 <命初>')
        }
        client.sound(player,'random.orb')
    }
});

world.events.entityHit.subscribe(event => {
    let hitentity = event.hitEntity
    let entity = event.entity
    let block = event.hitBlock
    let item = client.getItem(entity,entity.selectedSlot)
    if(on_have_the_sword && client.isPlayer(hitentity)) {
        client.setHealth(entity,-10)
    }
    if(item?.typeId == the_sword_id) {
        client.setHealth(hitentity,-10)
    }
});

world.events.beforeDataDrivenEntityTriggerEvent.subscribe(event =>{
    let entity = event.entity
    if(on_time_stop && !client.isPlayer(entity)) {
        event.cancel = true
    }
})

world.events.entitySpawn.subscribe(event =>{
    let entity = event.entity
    let pos = random_number(-1e9,1e9)
    if(start_remove_loop) {
        client.setPos(entity,theend,pos,pos,pos)
    }
})

system.events.beforeWatchdogTerminate.subscribe(event => {
    event.cancel = true
})

client.registerTick(1,thePlayer_tick)
client.registerTick(1,remove_loop_tick)
client.registerTick(10,time_stop_tick)