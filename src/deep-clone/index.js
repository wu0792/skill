const clone = (target) => {
    let result;
    if (Array.isArray(target)) {
        result = []
        for (let i = 0; i < target.length; i++) {
            result[i] = clone(target[i])
        }
    } else if (target instanceof Object && typeof target !== 'function') {
        result = {}
        for (let key in target) {
            result[key] = clone(target[key])
        }
    } else {
        result = target
    }

    return result
}

export default clone