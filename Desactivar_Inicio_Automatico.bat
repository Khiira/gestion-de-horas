@echo off
echo Desactivando el inicio automatico de Gestion de Horas en Windows...
del /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Gestion de Horas Pro (Inicio Automatico).lnk"
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Gestion de Horas Pro (Inicio Automatico).lnk" (
    echo.
    echo [EXITO] Se ha desactivado el inicio automatico. El sistema ya no se abrira solo al encender la PC.
) else (
    echo [ERROR] No se pudo encontrar o eliminar el acceso directo.
)
pause
