import { SpawnObjectInstance as Spawn } from "./SpawnObject"
import { AreaInstance as Area } from "./Area"
import { geo_obj_init, geo_obj_init_animation_accel, GRAPH_RENDER_INVISIBLE } from "../engine/graph_node"
import { oPosX, oPosY, oPosZ, oFaceAngleRoll, oFaceAnglePitch, oFaceAngleYaw, oMoveAnglePitch, oMoveAngleRoll, oMoveAngleYaw, oParentRelativePosX, oParentRelativePosY, oParentRelativePosZ, oBehParams2ndByte, oBehParams, oVelX, oForwardVel, oVelZ, oVelY, oGravity, oAnimState, oIntangibleTimer, oAnimations, ACTIVE_FLAGS_DEACTIVATED, OBJ_MOVE_ABOVE_DEATH_BARRIER, ACTIVE_FLAG_FAR_AWAY, ACTIVE_FLAG_IN_DIFFERENT_ROOM, oFloorHeight, oFloor, oFloorType, oFloorRoom, OBJ_MOVE_MASK_HIT_WALL_OR_IN_WATER, OBJ_MOVE_IN_AIR, oWallHitboxRadius, oWallAngle, oMoveFlags, OBJ_MOVE_ABOVE_LAVA, OBJ_MOVE_HIT_WALL, oBounciness, oBuoyancy, oDragStrength, OBJ_MOVE_HIT_EDGE, OBJ_MOVE_ON_GROUND, OBJ_MOVE_AT_WATER_SURFACE, OBJ_MOVE_MASK_IN_WATER, OBJ_MOVE_LEAVING_WATER, OBJ_MOVE_ENTERED_WATER, OBJ_MOVE_MASK_ON_GROUND, OBJ_MOVE_UNDERWATER_ON_GROUND, OBJ_MOVE_LEFT_GROUND, OBJ_MOVE_UNDERWATER_OFF_GROUND, OBJ_MOVE_MASK_33, oRoom, ACTIVE_FLAG_UNK10, OBJ_MOVE_13, OBJ_MOVE_LANDED } from "../include/object_constants"

import { ObjectListProcessorInstance as ObjectListProc } from "./ObjectListProcessor"
import { atan2s, mtxf_rotate_zxy_and_translate } from "../engine/math_util"
import { sins, coss } from "../utils"
import { GeoRendererInstance as GeoRenderer } from "../engine/GeoRenderer"
import { SURFACE_BURNING, SURFACE_DEATH_PLANE } from "../include/surface_terrains"

export const cur_obj_extend_animation_if_at_end = () => {
    const o = ObjectListProc.gCurrentObject

    const sp4 = o.header.gfx.unk38.animFrame
    const sp0 = o.header.gfx.unk38.curAnim.unk08 - 2

    if (sp4 == sp0) o.header.gfx.unk38.animFrame--
}

export const geo_switch_anim_state = (run, node) => {
    if (run == 1) {
        let obj = GeoRenderer.gCurGraphNodeObject.wrapperObjectNode.wrapperObject

        const switchCase = node

        if (GeoRenderer.gCurGraphNodeHeldObject) {
            obj = GeoRenderer.gCurGraphNodeHeldObject.objNode
        }

        // if the case is greater than the number of cases, set to 0 to avoid overflowing
        // the switch.
        if (obj.rawData[oAnimState] >= switchCase.numCases) {
            obj.rawData[oAnimState] = 0
        }

        switchCase.selectedCase = obj.rawData[oAnimState]
    }
}

const spawn_object_at_origin = (parent, model, behavior) => {

    const obj = Spawn.create_object(behavior)

    obj.parentObj = parent
    obj.header.gfx.unk18 = parent.header.gfx.unk18
    obj.header.gfx.unk19 = parent.header.gfx.unk18

    geo_obj_init(obj.header.gfx, Area.gLoadedGraphNodes[model], [0,0,0], [0,0,0])

    return obj

}

export const spawn_object_abs_with_rot = (parent, model, behavior, x, y, z, rx, ry, rz) => {
    const newObj = spawn_object_at_origin(parent, model, behavior)
    obj_set_pos(newObj, x, y, z)
    obj_set_angle(newObj, rx, ry, rz)
    return newObj
}

export const obj_apply_scale_to_matrix = (obj, dst, src) => {
    dst[0][0] = src[0][0] * obj.header.gfx.scale[0]
    dst[1][0] = src[1][0] * obj.header.gfx.scale[1]
    dst[2][0] = src[2][0] * obj.header.gfx.scale[2]
    dst[3][0] = src[3][0]

    dst[0][1] = src[0][1] * obj.header.gfx.scale[0]
    dst[1][1] = src[1][1] * obj.header.gfx.scale[1]
    dst[2][1] = src[2][1] * obj.header.gfx.scale[2]
    dst[3][1] = src[3][1]

    dst[0][2] = src[0][2] * obj.header.gfx.scale[0]
    dst[1][2] = src[1][2] * obj.header.gfx.scale[1]
    dst[2][2] = src[2][2] * obj.header.gfx.scale[2]
    dst[3][2] = src[3][2]

    dst[0][3] = src[0][3]
    dst[1][3] = src[1][3]
    dst[2][3] = src[2][3]
    dst[3][3] = src[3][3]
}

export const obj_build_transform_from_pos_and_angle = (obj, posIndex, angleIndex) => {
    const translate = new Array(3)
    const rotation = new Array(3)

    translate[0] = obj.rawData[posIndex + 0]
    translate[1] = obj.rawData[posIndex + 1]
    translate[2] = obj.rawData[posIndex + 2]

    rotation[0] = obj.rawData[angleIndex + 0]
    rotation[1] = obj.rawData[angleIndex + 1]
    rotation[2] = obj.rawData[angleIndex + 2]

    mtxf_rotate_zxy_and_translate(obj.transform, translate, rotation)

} 

const obj_translate_local = (obj, posIndex, localTranslateIndex) => {
    const dx = obj.rawData[localTranslateIndex + 0]
    const dy = obj.rawData[localTranslateIndex + 1]
    const dz = obj.rawData[localTranslateIndex + 2]

    obj.rawData[posIndex + 0] += obj.transform[0][0] * dx + obj.transform[1][0] * dy + obj.transform[2][0] * dz
    obj.rawData[posIndex + 1] += obj.transform[0][1] * dx + obj.transform[1][1] * dy + obj.transform[2][1] * dz
    obj.rawData[posIndex + 2] += obj.transform[0][2] * dx + obj.transform[1][2] * dy + obj.transform[2][2] * dz
}

const obj_build_relative_transform = (obj) => {
    obj_build_transform_from_pos_and_angle(obj, oParentRelativePosX /* Takes all XYZ */, oFaceAnglePitch, /* Takes all roll, pitch, yaw */)
    obj_translate_local(obj, oPosX, oParentRelativePosX)
}

export const linear_mtxf_mul_vec3f = (m, dst, v) => {
    for (let i = 0; i < 3; i++) {
        dst[i] = m[0][i] * v[0] + m[1][i] * v[1] + m[2][i] * v[2]
    }
}

export const linear_mtxf_transpose_mul_vec3f = (m, dst, v) => {
    for (let i = 0; i < 3; i++) {
        dst[i] = m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]
    }
}

export const abs_angle_diff = (x0, x1) => {
    const diff = x1 - x0

    if (diff == -0x8000) {
        diff = -0x7FFF
    }

    if (diff < 0) {
        diff = -diff
    }

    return diff
}

export const cur_obj_resolve_wall_collisions = () => {
    const o = ObjectListProc.gCurrentObject

    const offsetY = 10.0
    const radius = o.rawData[oWallHitboxRadius]

    if (radius > 0.1) {
        const collisionData = {
            offsetY,
            radius,
            x: parseInt(o.rawData[oPosX]),
            y: parseInt(o.rawData[oPosY]),
            z: parseInt(o.rawData[oPosZ]),
            walls: []
        }

        const numCollisions = Spawn.SurfaceCollision.find_wall_collisions(collisionData)
        if (numCollisions != 0) {
            o.rawData[oPosX] = collisionData.x
            o.rawData[oPosY] = collisionData.y
            o.rawData[oPosZ] = collisionData.z

            const wall = collisionData.walls[collisionData.numWalls - 1]

            o.rawData[oWallAngle] = atan2s(wall.normal.z, wall.normal.x)
            if (abs_angle_diff(o.rawData[oWallAngle], o.rawData[oMoveAngleYaw]) > 0x4000) {
                return 1
            } else {
                return 0
            }

        }
    }

    return 0
}

export const cur_obj_update_floor_height_and_get_floor = () => {

    const o = ObjectListProc.gCurrentObject

    const floorWrapper = {}
    o.rawData[oFloorHeight] = Spawn.SurfaceCollision.find_floor(o.rawData[oPosX], o.rawData[oPosY], o.rawData[oPosZ], floorWrapper)
    return floorWrapper.floor
}


export const cur_obj_update_floor = () => {
    const o = ObjectListProc.gCurrentObject
    const floor = cur_obj_update_floor_height_and_get_floor()
    o.rawData[oFloor] = floor

    if (floor) {
        if (floor.type == SURFACE_BURNING) o.rawData[oMoveFlags] |= OBJ_MOVE_ABOVE_LAVA
        else if (floor.type == SURFACE_DEATH_PLANE) o.rawData[oMoveFlags] |= OBJ_MOVE_ABOVE_DEATH_BARRIER

        o.rawData[oFloorType] = floor.type
        o.rawData[oFloorRoom] = floor.room
    } else {
        o.rawData[oFloorType] = 0
        o.rawData[oFloorRoom] = 0
    }

}

export const cur_obj_update_floor_and_resolve_wall_collisions = (steepSlopeDegrees) => {
    const o = ObjectListProc.gCurrentObject

    o.rawData[oMoveFlags] &= ~(OBJ_MOVE_ABOVE_LAVA | OBJ_MOVE_ABOVE_DEATH_BARRIER)

    if (o.activeFlags & (ACTIVE_FLAG_FAR_AWAY | ACTIVE_FLAG_IN_DIFFERENT_ROOM)) {
        cur_obj_update_floor()
        o.rawData[oMoveFlags] &= ~OBJ_MOVE_MASK_HIT_WALL_OR_IN_WATER

        if (o.rawData[oPosY] > o.rawData[oFloorHeight]) {
            o.rawData[oMoveFlags] |= OBJ_MOVE_IN_AIR
        }
    } else {
        o.rawData[oMoveFlags] &= ~OBJ_MOVE_HIT_WALL
        if (cur_obj_resolve_wall_collisions()) {
            o.rawData[oMoveFlags] |= OBJ_MOVE_HIT_WALL
        }

        cur_obj_update_floor()

        if (o.rawData[oPosY] > o.rawData[oFloorHeight]) {
            o.rawData[oMoveFlags] |= OBJ_MOVE_IN_AIR
        }

        /// TODO detect steep floor as hitting wall

    }
}
export const cur_obj_update_floor_and_walls = () => {
    cur_obj_update_floor_and_resolve_wall_collisions(60)
}

export const clear_move_flag = (bitSet, flag) => {
    if (bitSet & flag) {
        bitSet &= flag ^ 0xFFFFFFFF
        return { result: 1, bitSet }
    } else {
        return { result: 0, bitSet }
    }
}

export const cur_obj_move_update_ground_air_flags = (gravity, bounciness) => {

    const o = ObjectListProc.gCurrentObject

    o.rawData[oMoveFlags] &= ~OBJ_MOVE_13

    if (o.rawData[oPosY] < o.rawData[oFloorHeight]) {
        // On the first frame that we touch the ground, set OBJ_MOVE_LANDED.
        // On subsequent frames, set OBJ_MOVE_ON_GROUND
        if (!(o.rawData[oMoveFlags] & OBJ_MOVE_ON_GROUND)) {

            const { result, newBitSet } = clear_move_flag(o.rawData[oMoveFlags], OBJ_MOVE_LANDED)
            o.rawData[oMoveFlags] = newBitSet
            if (result) {
                o.rawData[oMoveFlags] |= OBJ_MOVE_ON_GROUND
            } else {
                o.rawData[oMoveFlags] |= OBJ_MOVE_LANDED
            }
        }

        o.rawData[oPosY] = o.rawData[oFloorHeight]

        if (o.rawData[oVelY] < 0.0) {
            o.rawData[oVelY] *= bounciness
        }

        if (o.rawData[oVelY] > 5.0) {
            //! If OBJ_MOVE_13 tracks bouncing, it overestimates, since velY
            // could be > 5 here without bounce (e.g. jump into misa)
            o.rawData[oMoveFlags] |= OBJ_MOVE_13
        }
    } else {
        o.rawData[oMoveFlags] &= ~OBJ_MOVE_LANDED
        const { result, newBitSet } = clear_move_flag(o.rawData[oMoveFlags], OBJ_MOVE_ON_GROUND)
        o.rawData[oMoveFlags] = newBitSet
        if (result) {
            o.rawData[oMoveFlags] |= OBJ_MOVE_LEFT_GROUND
        }
    }

    o.rawData[oMoveFlags] &= ~OBJ_MOVE_MASK_IN_WATER
}

export const cur_obj_move_y_and_get_water_level = (gravity, buoyancy) => {

    const o = ObjectListProc.gCurrentObject

    let waterLevel

    o.rawData[oVelY] += gravity + buoyancy
    if (o.rawData[oVelY] < -78.0) {
        o.rawData[oVelY] = -78.0
    }

    o.rawData[oPosY] += o.rawData[oVelY]
    if (o.activeFlags & ACTIVE_FLAG_UNK10) {
        waterLevel = -11000.0
    } else {
        waterLevel = Spawn.SurfaceCollision.find_water_level(o.rawData[oPosX], o.rawData[oPosZ])
    }

    return waterLevel
}


export const cur_obj_move_xz = (steepSlopeNormalY, careAboutEdgesAndSteepSlopes) => {

    const o = ObjectListProc.gCurrentObject

    const intendedX = o.rawData[oPosX] + o.rawData[oVelX]
    const intendedZ = o.rawData[oPosZ] + o.rawData[oVelZ]

    const intendedFloorWrapper = {}
    const intendedFloorHeight = Spawn.SurfaceCollision.find_floor(intendedX, o.rawData[oPosY], intendedZ, intendedFloorWrapper)
    const deltaFloorHeight = intendedFloorHeight - o.rawData[oFloorHeight]


    o.rawData[oMoveFlags] &= ~OBJ_MOVE_HIT_EDGE 

    if (o.rawData[oRoom] != -1 && intendedFloorWrapper.floor) {
        if (intendedFloorWrapper.floor.room != 0 && o.rawData[oRoom] != intendedFloorWrapper.floor.room && intendedFloorWrapper.floor.room != 18) {
            // Don't leave native room
            return 0
        }
    }

    if (intendedFloorHeight < -10000.0) {
        // Don't move into OoB
        o.rawData[oMoveFlags] |= OBJ_MOVE_HIT_EDGE
        return 0
    } else if (deltaFloorHeight < 5.0) {
        if (!careAboutEdgesAndSteepSlopes) {
            // If we don't care about edges or steep slopes, okay to move
            o.rawData[oPosX] = intendedX
            o.rawData[oPosZ] = intendedZ
            return 1
        } else if (deltaFloorHeight < -50.0 && (o.rawData[oMoveFlags] & OBJ_MOVE_ON_GROUND)) {
            // Don't walk off an edge
            o.rawData[oMoveFlags] |= OBJ_MOVE_HIT_EDGE
            return 0
        } else if (intendedFloorWrapper.floor.normal.y > steepSlopeNormalY) {
            // Allow movement onto a slope, provided it's not too steep
            o.rawData[oPosX] = intendedX
            o.rawData[oPosZ] = intendedZ
            return 1
        } else {
            // We are likely trying to move onto a steep downward slope
            o.rawData[oMoveFlags] |= OBJ_MOVE_HIT_EDGE
            return 0
        }
    } else if ((intendedFloorWrapper.floor.normal.y) > steepSlopeNormalY || o.rawData[oPosY] > intendedFloorHeight) {
        // Allow movement upward, provided either:
        // - The target floor is flat enough (e.g. walking up stairs)
        // - We are above the target floor (most likely in the air)
        o.rawData[oPosX] = intendedX
        o.rawData[oPosZ] = intendedZ
        //! Returning FALSE but moving anyway (not exploitable; return value is
        //  never used)
    }

    // We are likely trying to move onto a steep upward slope
    return 0
}

export const cur_obj_move_y = (gravity, bounciness, buoyancy) => {

    const o = ObjectListProc.gCurrentObject

    o.rawData[oMoveFlags] &= ~OBJ_MOVE_LEFT_GROUND

    if (o.rawData[oMoveFlags] & OBJ_MOVE_AT_WATER_SURFACE) {
        if (o.rawData[oVelY] > 5.0) {
            o.rawData[oMoveFlags] &= ~OBJ_MOVE_MASK_IN_WATER
            o.rawData[oMoveFlags] |= OBJ_MOVE_LEAVING_WATER
        }
    }

    if (!(o.rawData[oMoveFlags] & OBJ_MOVE_MASK_IN_WATER)) {
        const waterLevel = cur_obj_move_y_and_get_water_level(gravity, 0.0)
        if (o.rawData[oPosY] > waterLevel) {
            //! We only handle floor collision if the object does not enter
            //  water. This allows e.g. coins to clip through floors if they
            //  enter water on the same frame.
            cur_obj_move_update_ground_air_flags(gravity, bounciness)
        } else {
            o.rawData[oMoveFlags] |= OBJ_MOVE_ENTERED_WATER
            o.rawData[oMoveFlags] &= ~OBJ_MOVE_MASK_ON_GROUND
        }
    } else {
        o.rawData[oMoveFlags] &= ~OBJ_MOVE_ENTERED_WATER

        const waterLevel = cur_obj_move_y_and_get_water_level(gravity, buoyancy)
        if (o.rawData[oPosY] < waterLevel) {
            throw "cur_obj_move_y implement underwater"
            cur_obj_move_update_underwater_flags()
        } else {
            if (o.rawData[oPosY] < o.rawData[oFloorHeight]) {
                o.rawData[oPosY] = o.rawData[oFloorHeight]
                o.rawData[oMoveFlags] &= ~OBJ_MOVE_MASK_IN_WATER
            } else {
                o.rawData[oPosY] = waterLevel
                o.rawData[oVelY] = 0.0
                o.rawData[oMoveFlags] &= ~(OBJ_MOVE_UNDERWATER_OFF_GROUND | OBJ_MOVE_UNDERWATER_ON_GROUND)
                o.rawData[oMoveFlags] |= OBJ_MOVE_AT_WATER_SURFACE
            }
        }
    }

    if (o.rawData[oMoveFlags] & OBJ_MOVE_MASK_33) {
        o.rawData[oMoveFlags] &= ~OBJ_MOVE_IN_AIR
    } else {
        o.rawData[oMoveFlags] |= OBJ_MOVE_IN_AIR
    }
}


export const cur_obj_move_standard = (steepSlopeAngleDegrees) => {
    const o = ObjectListProc.gCurrentObject
    const gravity = o.rawData[oGravity]
    const bounciness = o.rawData[oBounciness]
    const bouyancy = o.rawData[oBuoyancy]
    const dragStrength = o.rawData[oDragStrength]
    let steepSlopeNormalY
    let careAboutEdgesAndSteepSlopes = 0
    let negativeSpeed = 0

    //! Because some objects allow these active flags to be set but don't
    //  avoid updating when they are, we end up with "partial" updates, where
    //  an object's internal state will be updated, but it doesn't move.
    //  This allows numerous glitches and is typically referred to as
    //  deactivation (though this term has a different meaning in the code).
    //  Objects that do this will be marked with //PARTIAL_UPDATE.

    if (!(o.activeFlags & (ACTIVE_FLAG_FAR_AWAY | ACTIVE_FLAG_IN_DIFFERENT_ROOM))) {
        if (steepSlopeAngleDegrees < 0) {
            careAboutEdgesAndSteepSlopes = 1
            steepSlopeAngleDegrees = -steepSlopeAngleDegrees
        }

        steepSlopeNormalY = coss(steepSlopeAngleDegrees * (0x10000 / 360))

        cur_obj_compute_vel_xz()
        cur_obj_apply_drag_xz(dragStrength)

        cur_obj_move_xz(steepSlopeNormalY, careAboutEdgesAndSteepSlopes)
        cur_obj_move_y(gravity, bounciness, bouyancy)

        if (o.rawData[oForwardVel] < 0) {
            negativeSpeed = 1
        }

        o.rawData[oForwardVel] = Math.sqrt(Math.pow(o.rawData[oVelX], 2) + Math.pow(o.rawData[oVelZ], 2))
        if (negativeSpeed) {
            o.rawData[oForwardVel] = -o.rawData[oForwardVel]
        }
    }

}

export const spawn_object_relative = (behaviorParam, relativePosX, relativePosY, relativePosZ, parent, model, behavior) => {

    const obj = spawn_object_at_origin(parent, model, behavior)

    obj_copy_pos_and_angle(obj, parent)
    obj_set_parent_relative_pos(obj, relativePosX, relativePosY, relativePosZ)
    obj_build_relative_transform(obj)

    obj.rawData[oBehParams2ndByte] = behaviorParam
    obj.rawData[oBehParams] = (behaviorParam & 0xFF) << 16

    return obj
}

export const spawn_object = (parent, model, behavior) => {
    const obj = spawn_object_at_origin(parent, model, behavior)
    obj_copy_pos_and_angle(obj, parent)
    return obj
}

export const obj_copy_pos_and_angle = (dst, src) => {

    obj_copy_pos(dst, src)
    obj_copy_angle(dst, src)
}

export const obj_copy_angle = (dst, src) => {

    dst.rawData[oFaceAnglePitch] = src.rawData[oFaceAnglePitch]
    dst.rawData[oFaceAngleYaw] = src.rawData[oFaceAngleYaw]
    dst.rawData[oFaceAngleRoll] = src.rawData[oFaceAngleRoll]

    dst.rawData[oMoveAnglePitch] = src.rawData[oMoveAnglePitch]
    dst.rawData[oMoveAngleYaw] = src.rawData[oMoveAngleYaw]
    dst.rawData[oMoveAngleRoll] = src.rawData[oMoveAngleRoll]
}

export const obj_copy_pos = (dst, src) => {

    dst.rawData[oPosX] = src.rawData[oPosX]
    dst.rawData[oPosY] = src.rawData[oPosY]
    dst.rawData[oPosZ] = src.rawData[oPosZ]
}

export const obj_set_pos = (obj, x, y, z) => {

    obj.rawData[oPosX] = x
    obj.rawData[oPosY] = y
    obj.rawData[oPosZ] = z
}

export const obj_set_parent_relative_pos = (obj, relX, relY, relZ) => {
    obj.rawData[oParentRelativePosX] = relX
    obj.rawData[oParentRelativePosY] = relY
    obj.rawData[oParentRelativePosZ] = relZ

}

export const obj_set_angle = (obj, pitch, yaw, roll) => {

    obj.rawData[oFaceAnglePitch] = pitch
    obj.rawData[oFaceAngleYaw] = yaw
    obj.rawData[oFaceAngleRoll] = roll

    obj.rawData[oMoveAnglePitch] = pitch
    obj.rawData[oMoveAngleYaw] = yaw
    obj.rawData[oMoveAngleRoll] = roll
}

export const cur_obj_within_12k_bounds = () => {
    const o = ObjectListProc.gCurrentObject

    if (o.rawData[oPosX] < -12000 || 12000 < o.rawData[oPosX]) return 0
    if (o.rawData[oPosY] < -12000 || 12000 < o.rawData[oPosY]) return 0
    if (o.rawData[oPosZ] < -12000 || 12000 < o.rawData[oPosZ]) return 0

    return 1
}

export const cur_obj_become_tangible = () => {
    const o = ObjectListProc.gCurrentObject
    o.rawData[oIntangibleTimer] = 0
}

export const cur_obj_become_intangible = () => {
    const o = ObjectListProc.gCurrentObject
    o.rawData[oIntangibleTimer] = -1
}

export const cur_obj_hide = () => {
    o.header.gfx.node.flags |= GRAPH_RENDER_INVISIBLE
}

export const obj_mark_for_deletion = (obj) => {
    obj.activeFlags = ACTIVE_FLAGS_DEACTIVATED
}

export const cur_obj_scale = (scale) => {
    const o = ObjectListProc.gCurrentObject
    o.header.gfx.scale[0] = scale
    o.header.gfx.scale[1] = scale
    o.header.gfx.scale[2] = scale
}

export const cur_obj_init_animation_with_accel_and_sound = (animIndex, accel) => {
    const o = ObjectListProc.gCurrentObject
    const anims = o.rawData[oAnimations]
    const animAccel = parseInt(accel * 65536.0)
    geo_obj_init_animation_accel(o.header.gfx, anims[animIndex], animAccel)
}

export const cur_obj_compute_vel_xz = () => {
    const o = ObjectListProc.gCurrentObject
    o.rawData[oVelX] = o.rawData[oForwardVel] * sins(o.rawData[oMoveAngleYaw])
    o.rawData[oVelZ] = o.rawData[oForwardVel] * coss(o.rawData[oMoveAngleYaw])
}

export const apply_drag_to_value = (ptr, dragStrength) => {

    if (ptr.value != 0) {
        //! Can overshoot if |*value| > 1/(dragStrength * 0.0001)
        const decel = (ptr.value) * (ptr.value) * (dragStrength * 0.0001)

        if (ptr.value > 0) {
            ptr.value -= decel
            if (ptr.value < 0.001) {
                ptr.value = 0
            }
        } else {
            ptr.value += decel
            if (ptr.value > -0.001) {
                ptr.value = 0
            }
        }
    }
}


export const cur_obj_apply_drag_xz = (dragStrength) => {

    const o = ObjectListProc.gCurrentObject

    const wrapper = { value: o.rawData[oVelX] }
    apply_drag_to_value(wrapper, dragStrength)
    o.rawData[oVelX] = wrapper.value

    wrapper.value = o.rawData[oVelZ]
    apply_drag_to_value(wrapper, dragStrength)
    o.rawData[oVelZ] = wrapper.value
}

export const cur_obj_move_using_vel_and_gravity = () => {
    const o = ObjectListProc.gCurrentObject
    if (cur_obj_within_12k_bounds()) {
        o.rawData[oPosX] += o.rawData[oVelX]
        o.rawData[oPosZ] += o.rawData[oVelZ]
        o.rawData[oVelY] += o.rawData[oGravity]
        o.rawData[oPosY] += o.rawData[oVelY]
    }
}

export const cur_obj_move_using_fvel_and_gravity = () => {
    cur_obj_compute_vel_xz()
    cur_obj_move_using_vel_and_gravity()
}

export const cur_obj_push_mario_away = (radius, m) => {
    const o = ObjectListProc.gCurrentObject
    const marioRelX = m.marioObj.rawData[oPosX] - o.rawData[oPosX]
    const marioRelZ = m.marioObj.rawData[oPosZ] - o.rawData[oPosZ]
    const marioDist = Math.sqrt(Math.pow(marioRelX, 2) + Math.pow(marioRelZ, 2))

    if (marioDist < radius) {
        const newPos = [
            m.pos[0] + (radius - marioDist) / radius * marioRelX,
            m.pos[1],
            m.pos[2] + (radius - marioDist) / radius * marioRelZ
        ]
        const floorWrapper = {}
        const floorHeight = ObjectListProc.SurfaceCollision.find_floor(newPos[0], newPos[1], newPos[2], floorWrapper)

        if (floorWrapper.floor == null || floorHeight == -11000) return

        m.pos[0] = newPos[0]
        m.pos[1] = floorHeight
        m.pos[2] = newPos[2]
        m.floor = floorWrapper.floor
        m.floorHeight = floorHeight
    }
}

export const dist_between_objects = (obj1, obj2) => {
    const dx = obj1.rawData[oPosX] - obj2.rawData[oPosX]
    const dy = obj1.rawData[oPosY] - obj2.rawData[oPosY]
    const dz = obj1.rawData[oPosZ] - obj2.rawData[oPosZ]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export const obj_angle_to_object = (obj1, obj2) => {
    const x1 = obj1.rawData[oPosX], z1 = obj1.rawData[oPosZ]
    const x2 = obj2.rawData[oPosX], z2 = obj2.rawData[oPosZ]

    return atan2s(z2 - z1, x2 - x1)
}
