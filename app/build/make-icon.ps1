# 生成 build/icon.ico 与 build/icon.png（纯 System.Drawing，无第三方依赖）
Add-Type -AssemblyName System.Drawing

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sizes  = @(256, 128, 64, 48, 32, 16)

function New-IconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [math]::Max(1, [int]($size * 0.04))
  $rect = New-Object System.Drawing.RectangleF($pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad))
  $r = [float]$size * 0.22
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()

  $c1 = [System.Drawing.Color]::FromArgb(255, 34, 211, 238)   # 青
  $c2 = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)    # 蓝
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55.0)
  $g.FillPath($brush, $path)

  if ($size -ge 32) {
    $font = $null
    foreach ($name in @('Microsoft YaHei UI', 'Microsoft YaHei', 'SimHei', 'Segoe UI')) {
      $f = New-Object System.Drawing.Font($name, ([float]$size * 0.56), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
      if ($f.Name -eq $name) { $font = $f; break }
    }
    if (-not $font) { $font = New-Object System.Drawing.Font('Arial', ([float]$size * 0.56), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel) }
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $sf.FormatFlags = [System.Drawing.StringFormatFlags]::NoClip
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 0, 0))
    $box = New-Object System.Drawing.RectangleF(0, ([float]$size * 0.04), $size, $size)
    $g.DrawString('简', $font, $shadow, $box, $sf)
    $box2 = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString('简', $font, $white, $box2, $sf)
    $font.Dispose(); $white.Dispose(); $shadow.Dispose(); $sf.Dispose()
  } else {
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($white, ($size * 0.3), ($size * 0.3), ($size * 0.4), ($size * 0.4))
    $white.Dispose()
  }

  $brush.Dispose(); $path.Dispose(); $g.Dispose()
  return $bmp
}

# PNG 版（1024）
$big = New-IconBitmap 1024
$big.Save((Join-Path $outDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$big.Dispose()

# 各尺寸 PNG 字节
$pNGs = @()
foreach ($s in $sizes) {
  $bmp = New-IconBitmap $s
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pNGs += ,@($s, $ms.ToArray())
  $ms.Dispose(); $bmp.Dispose()
}

# 写 ICO 容器
$icoPath = Join-Path $outDir 'icon.ico'
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)                 # reserved
$bw.Write([UInt16]1)                 # type = icon
$bw.Write([UInt16]$pNGs.Count)       # count

$offset = 6 + 16 * $pNGs.Count
foreach ($item in $pNGs) {
  $s = $item[0]; $bytes = $item[1]
  $dim = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$dim)              # width
  $bw.Write([byte]$dim)              # height
  $bw.Write([byte]0)                 # colors
  $bw.Write([byte]0)                 # reserved
  $bw.Write([UInt16]1)               # planes
  $bw.Write([UInt16]32)              # bit count
  $bw.Write([UInt32]$bytes.Length)   # size
  $bw.Write([UInt32]$offset)         # offset
  $offset += $bytes.Length
}
foreach ($item in $pNGs) { $bw.Write($item[1]) }
$bw.Flush(); $bw.Close(); $fs.Close()

Get-Item $icoPath, (Join-Path $outDir 'icon.png') | Select-Object Name, Length | Format-Table -AutoSize | Out-String
