// CSP-safe replacement for the ndarray module bundled inside
// @imgly/background-removal. The upstream implementation compiles a constructor
// with `new Function(...)`, which Chrome MV3 extension pages reject because
// 'unsafe-eval' is not allowed. This implementation exposes the same ndarray
// surface (@imgly only relies on shape, data, get() and set()) without eval.
var require_ndarray = __commonJS({
	"ndarray-csp-safe"(exports, module) {
		"use strict"

		function dtypeOf(data) {
			if (Array.isArray(data)) return "array"
			if (typeof Buffer !== "undefined" && Buffer.isBuffer?.(data)) {
				return "buffer"
			}
			if (data && data.constructor && data.constructor.name) {
				switch (data.constructor.name) {
					case "Float32Array":
						return "float32"
					case "Float64Array":
						return "float64"
					case "Int8Array":
						return "int8"
					case "Int16Array":
						return "int16"
					case "Int32Array":
						return "int32"
					case "Uint8Array":
						return "uint8"
					case "Uint8ClampedArray":
						return "uint8_clamped"
					case "Uint16Array":
						return "uint16"
					case "Uint32Array":
						return "uint32"
					case "BigInt64Array":
						return "bigint64"
					case "BigUint64Array":
						return "biguint64"
				}
			}
			return "generic"
		}

		function createView(data, shape, stride, offset, dtype) {
			var dimension = shape.length
			var view = {
				data: data,
				shape: shape,
				stride: stride,
				offset: offset,
				dtype: dtype,
				dimension: dimension,
			}

			Object.defineProperty(view, "size", {
				enumerable: true,
				get: function () {
					var size = 1
					for (var i = 0; i < dimension; i++) size *= shape[i]
					return size
				},
			})

			Object.defineProperty(view, "order", {
				enumerable: true,
				get: function () {
					var terms = []
					for (var i = 0; i < dimension; i++) {
						terms.push([Math.abs(stride[i]), i])
					}
					terms.sort(function (a, b) {
						return a[0] - b[0]
					})
					var order = new Array(dimension)
					for (var j = 0; j < dimension; j++) order[j] = terms[j][1]
					return order
				},
			})

			view.index = function () {
				var index = offset
				for (var i = 0; i < dimension; i++) {
					index += stride[i] * (arguments[i] || 0)
				}
				return index
			}

			view.get = function () {
				var index = offset
				for (var i = 0; i < dimension; i++) {
					index += stride[i] * arguments[i]
				}
				return data[index]
			}

			view.set = function () {
				var index = offset
				for (var i = 0; i < dimension; i++) {
					index += stride[i] * arguments[i]
				}
				data[index] = arguments[dimension]
				return data[index]
			}

			function cloneWith(nextShape, nextStride, nextOffset) {
				return createView(data, nextShape, nextStride, nextOffset, dtype)
			}

			view.lo = function () {
				var nextShape = shape.slice()
				var nextStride = stride.slice()
				var nextOffset = offset
				for (var i = 0; i < dimension; i++) {
					var value = arguments[i]
					if (typeof value === "number" && value >= 0) {
						nextOffset += nextStride[i] * value
						nextShape[i] -= value
					}
				}
				return cloneWith(nextShape, nextStride, nextOffset)
			}

			view.hi = function () {
				var nextShape = shape.slice()
				var nextStride = stride.slice()
				for (var i = 0; i < dimension; i++) {
					var value = arguments[i]
					if (typeof value === "number" && value >= 0) {
						nextShape[i] = Math.min(nextShape[i], value | 0)
					}
				}
				return cloneWith(nextShape, nextStride, offset)
			}

			view.step = function () {
				var nextShape = shape.slice()
				var nextStride = stride.slice()
				var nextOffset = offset
				for (var i = 0; i < dimension; i++) {
					var value = arguments[i]
					if (typeof value === "number") {
						var step = value | 0
						if (step < 0) {
							nextOffset += nextStride[i] * (nextShape[i] - 1)
							nextShape[i] = Math.ceil(-nextShape[i] / step)
						} else {
							nextShape[i] = Math.ceil(nextShape[i] / step)
						}
						nextStride[i] *= step
					} else {
						nextShape[i] = Math.ceil(nextShape[i])
					}
				}
				return cloneWith(nextShape, nextStride, nextOffset)
			}

			view.transpose = function () {
				var nextShape = new Array(dimension)
				var nextStride = new Array(dimension)
				var order = new Array(dimension)
				for (var i = 0; i < dimension; i++) {
					var value = arguments[i]
					order[i] = value === undefined ? i : value | 0
				}
				for (var j = 0; j < dimension; j++) {
					nextShape[j] = shape[order[j]]
					nextStride[j] = stride[order[j]]
				}
				return cloneWith(nextShape, nextStride, offset)
			}

			view.pick = function () {
				var nextShape = []
				var nextStride = []
				var nextOffset = offset
				for (var i = 0; i < dimension; i++) {
					var value = arguments[i]
					if (typeof value === "number" && value >= 0) {
						nextOffset += stride[i] * value
					} else {
						nextShape.push(shape[i])
						nextStride.push(stride[i])
					}
				}
				return cloneWith(nextShape, nextStride, nextOffset)
			}

			return view
		}

		function ndarray(data, shape, stride, offset) {
			if (data === undefined) data = []
			if (typeof data === "number") data = [data]
			if (shape === undefined) shape = [data.length]
			shape = shape.slice()
			var dimension = shape.length

			if (stride === undefined) {
				stride = new Array(dimension)
				for (var i = dimension - 1, size = 1; i >= 0; i--) {
					stride[i] = size
					size *= shape[i]
				}
			} else {
				stride = stride.slice()
			}

			if (offset === undefined) {
				offset = 0
				for (var j = 0; j < dimension; j++) {
					if (stride[j] < 0) {
						offset -= (shape[j] - 1) * stride[j]
					}
				}
			}

			return createView(data, shape, stride, offset, dtypeOf(data))
		}

		module.exports = ndarray
	},
})
