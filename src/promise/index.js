const PENDING = 0,
    FULLFILLED = 1,
    REJECTED = 2;

function noop() { }

let throwTypeError = (paraName, requiredType) => {
    throw new TypeError(`${paraName} is required as ${requiredType}`)
}

let _resolve = (promise, result) => {
    if (promise._state !== PENDING) {
        return
    }

    if (typeof result !== 'undefined') {
        promise._result = result
    }

    promise._state = FULLFILLED
    promise._subscribers.forEach(subscriber => {
        if (typeof subscriber === 'function') {
            subscriber(FULLFILLED, result)
        }
    })

    return promise
}

let _reject = (promise, reason) => {
    if (promise._state !== PENDING) {
        return
    }

    if (typeof reason !== 'undefined') {
        promise._result = reason
    }
    promise._state = REJECTED

    promise._subscribers.forEach(subscriber => {
        if (typeof subscriber === 'function') {
            subscriber(REJECTED, reason)
        }
    })

    return promise
}

let initPromise = (promise, resolver) => {
    try {
        resolver(value => {
            _resolve(promise, value)
        }, reason => {
            _reject(promise, reason)
        })
    } catch (ex) {
        if (promise._catch) {
            promise._catch(ex)
        }
    }
}

/**
 * 自定义Promise实现，
 */
class W_Promise {
    constructor(resolver) {
        this._state = PENDING
        this._result = undefined
        this._subscribers = []
        this.then = (onResolve, onReject) => {
            if (onResolve && typeof onResolve !== 'function') {
                throwTypeError('onResolve', 'function')
            }

            if (onReject && typeof onReject !== 'function') {
                throwTypeError('onReject', 'function')
            }

            this._subscribers.push(
                ((status, result) => {
                    if (status === FULLFILLED) {
                        if (onResolve) {
                            onResolve(this._result)
                        }
                    } else if (status === REJECTED) {
                        if (onReject) {
                            onReject(this._result)
                        }
                    }
                }))
        }

        this._catch = (ex) => {
            this._exception = ex
        }

        this.catch = (onException) => {
            if (typeof onException !== 'function') {
                throwTypeError('onException', 'function')
            }

            this._catch = (ex) => {
                this._exception = ex
                onException(ex)
            }

            if (this._exception) {
                onException(this._exception)
            }
        }

        if (resolver !== noop) {
            typeof resolver !== 'function' && throwTypeError('resolver', 'function')
            initPromise(this, resolver)
        }
    }

    static resolve(result) {
        if (result && result instanceof W_Promise) {
            return result
        }

        let promise = new W_Promise(noop)
        return _resolve(promise, result)
    }

    static reject(reason) {
        if (reason && reason instanceof W_Promise) {
            return reason
        }

        let promise = new W_Promise(noop)
        return _reject(promise, reason)
    }

    static all(promiseList) {
        if (Array.isArray(promiseList)) {
            let promise = new W_Promise(noop)
            promise._result = new Array(promiseList.length).fill(null)

            if (promiseList.length) {
                let checkStatus = () => {
                    let theResult = promise._result

                    if (theResult.some(itemResult => itemResult && itemResult.status === REJECTED)) {
                        _reject(promise, theResult.map(wrapper => wrapper ? wrapper.result : undefined))
                    } else if (theResult.every(itemResult => itemResult)) {
                        if (theResult.every(itemResult => itemResult.status === FULLFILLED)) {
                            _resolve(promise, theResult.map(wrapper => wrapper.result))
                        }
                    }
                }

                promiseList.forEach((thePromise, index) => {
                    if (thePromise instanceof W_Promise) {
                        if (thePromise._state !== PENDING) {
                            promise._result[index] = {
                                status: thePromise._state,
                                result: thePromise._result
                            }
                        } else {
                            thePromise._subscribers.push((status, result) => {
                                promise._result[index] = { status, result }
                                checkStatus()
                            })
                        }
                    } else {
                        promise._result[index] = {
                            status: FULLFILLED,
                            result: thePromise
                        }
                        checkStatus()
                    }
                })
            } else {
                _resolve(promise)
            }

            return promise
        } else {
            throwTypeError('promiseList', 'Array')
        }
    }
}

export default W_Promise

//test
let p1 = new W_Promise((resolve, reject) => {
    setTimeout(() => { console.log('p1.resolve'); resolve('hey1') }, 1000)
})

let p2 = new W_Promise((resolve, reject) => {
    setTimeout(() => { console.log('p2.resolve'); resolve('hey2') }, 2000)
})

W_Promise.all([p1, p2]).then((result) => {
    console.log('onFullfilled:' + result)
}, (reason) => {
    console.log('onReject.' + reason)
})