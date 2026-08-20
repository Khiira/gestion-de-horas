Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strDesktop = WshShell.SpecialFolders("Desktop")
strShortcutPath = objFSO.BuildPath(strDesktop, "Gestion de Horas Pro.lnk")

' Apuntar siempre al sistema principal en la raíz para conservar la base de datos original y toda la historia de registros
strTarget = objFSO.GetAbsolutePathName("Iniciar_Silencioso.vbs")
strWorkingDir = objFSO.GetAbsolutePathName(".")
strIcon = objFSO.GetAbsolutePathName("icono.ico") & ", 0"

Set oShellLink = WshShell.CreateShortcut(strShortcutPath)
oShellLink.TargetPath = strTarget
oShellLink.WorkingDirectory = strWorkingDir
oShellLink.IconLocation = strIcon
oShellLink.Description = "Sistema de Gestión de Horas Pro"
oShellLink.Save

WScript.Echo "Acceso directo del Escritorio configurado correctamente y apuntando a tu sistema principal con todos tus datos."
