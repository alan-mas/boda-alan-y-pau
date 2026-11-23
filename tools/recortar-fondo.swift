import Vision
import CoreImage
import AppKit
// uso: recorte <entrada> <salida.jpg>  → sujeto sin fondo sobre blanco, recorte vertical 1663:1829 centrado en el sujeto
let a = CommandLine.arguments
let ci = CIImage(contentsOf: URL(fileURLWithPath: a[1]))!
let ctx = CIContext()
let cg = ctx.createCGImage(ci, from: ci.extent)!
let h = VNImageRequestHandler(cgImage: cg)
let req = VNGenerateForegroundInstanceMaskRequest()
try h.perform([req])
let obs = req.results!.first!
let mask = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: h)
let mci = CIImage(cvPixelBuffer: mask)
// centroide horizontal del sujeto
CVPixelBufferLockBaseAddress(mask, .readOnly)
let w = CVPixelBufferGetWidth(mask), hh = CVPixelBufferGetHeight(mask), rb = CVPixelBufferGetBytesPerRow(mask)
let base = CVPixelBufferGetBaseAddress(mask)!
var sx = 0.0, sm = 0.0, minX = w, maxX = 0
for y in stride(from: 0, to: hh, by: 4) { let row = base.advanced(by: y*rb).assumingMemoryBound(to: Float32.self)
  for x in stride(from: 0, to: w, by: 4) { let v = Double(row[x]); sx += v*Double(x); sm += v; if v > 0.5 { minX = min(minX, x); maxX = max(maxX, x) } } }
CVPixelBufferUnlockBaseAddress(mask, .readOnly)
let cx = sx / max(sm, 1)
let blanco = CIImage(color: .white).cropped(to: ci.extent)
let comp = ci.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: blanco, kCIInputMaskImageKey: mci])
let r = 1663.0 / 1829.0
let iw = ci.extent.width, ih = ci.extent.height
var W = Double(maxX - minX) * 1.08
var H = W / r
H = max(ih, min(H, ih * 1.2)); W = H * r
let x0 = min(max(Double(minX + maxX) / 2 - W / 2, 0), max(iw - W, 0))
let lienzo = CIImage(color: .white).cropped(to: CGRect(x: 0, y: 0, width: W, height: H))
let out = comp.transformed(by: CGAffineTransform(translationX: -x0, y: 0)).composited(over: lienzo).cropped(to: lienzo.extent)
try ctx.writeJPEGRepresentation(of: out, to: URL(fileURLWithPath: a[2]), colorSpace: CGColorSpaceCreateDeviceRGB(), options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.85])
print("ok", Int(W), Int(H), minX, maxX)
