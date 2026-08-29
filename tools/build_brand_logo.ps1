param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Output
)

Add-Type -AssemblyName System.Drawing

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$outputPath = [System.IO.Path]::GetFullPath($Output)
$outputDir = [System.IO.Path]::GetDirectoryName($outputPath)
[System.IO.Directory]::CreateDirectory($outputDir) | Out-Null

$sourceBitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)
$bitmap = New-Object System.Drawing.Bitmap($sourceBitmap.Width, $sourceBitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$copyGraphics = [System.Drawing.Graphics]::FromImage($bitmap)
$copyGraphics.DrawImageUnscaled($sourceBitmap, 0, 0)
$copyGraphics.Dispose()
$sourceBitmap.Dispose()

$width = $bitmap.Width
$height = $bitmap.Height
$visited = New-Object 'bool[]' ($width * $height)
$queue = New-Object 'System.Collections.Generic.Queue[int]'

function Test-OuterWhite([System.Drawing.Color]$color) {
  return $color.A -gt 0 -and $color.R -ge 244 -and $color.G -ge 244 -and $color.B -ge 244
}

function Add-BackgroundPixel([int]$x, [int]$y) {
  if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height) { return }
  $index = $y * $width + $x
  if ($visited[$index]) { return }
  if (-not (Test-OuterWhite ($bitmap.GetPixel($x, $y)))) { return }
  $visited[$index] = $true
  $queue.Enqueue($index)
}

for ($x = 0; $x -lt $width; $x++) {
  Add-BackgroundPixel $x 0
  Add-BackgroundPixel $x ($height - 1)
}
for ($y = 0; $y -lt $height; $y++) {
  Add-BackgroundPixel 0 $y
  Add-BackgroundPixel ($width - 1) $y
}

while ($queue.Count -gt 0) {
  $index = $queue.Dequeue()
  $x = $index % $width
  $y = [Math]::Floor($index / $width)
  $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
  Add-BackgroundPixel ($x - 1) $y
  Add-BackgroundPixel ($x + 1) $y
  Add-BackgroundPixel $x ($y - 1)
  Add-BackgroundPixel $x ($y + 1)
}

$minX = $width
$minY = $height
$maxX = -1
$maxY = -1
for ($y = 0; $y -lt $height; $y++) {
  for ($x = 0; $x -lt $width; $x++) {
    if ($bitmap.GetPixel($x, $y).A -gt 0) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
if ($maxX -lt $minX -or $maxY -lt $minY) { throw 'No visible logo pixels were detected.' }

$cropWidth = $maxX - $minX + 1
$cropHeight = $maxY - $minY + 1
$canvasSize = 512
$padding = 10
$targetSize = $canvasSize - $padding * 2
$scale = [Math]::Min($targetSize / $cropWidth, $targetSize / $cropHeight)
$drawWidth = [int][Math]::Round($cropWidth * $scale)
$drawHeight = [int][Math]::Round($cropHeight * $scale)
$drawX = [int][Math]::Round(($canvasSize - $drawWidth) / 2)
$drawY = [int][Math]::Round(($canvasSize - $drawHeight) / 2)

$canvas = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$sourceRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)
$targetRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawWidth, $drawHeight)
$graphics.DrawImage($bitmap, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose()
$bitmap.Dispose()
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()

Write-Output $outputPath
