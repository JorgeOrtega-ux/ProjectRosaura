import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.abspath(os.path.join(script_dir, '../../'))
modal_file = os.path.join(project_dir, 'public', 'assets', 'js', 'core', 'components', 'ModalTemplates.js')

with open(modal_file, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # 1. activateChatConfirmationModal
    ('<button class="component-button component-button--h40" data-modal-action="cancel">${__(\'btn_accept\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="cancel">${__(\'btn_accept\')}</button>'),
     
    ('<a href="/upgrade" class="component-button component-button--h40">',
     '<a href="/upgrade" class="component-button component-button--primary component-button--h40">'),
     
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_activate_live_chat_confirm\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_activate_live_chat_confirm\')}</button>'),

    # 2. changePasswordModal
    ('<button class="component-button component-button--h40" data-action="submitVerifyCurrentPassword">${__(\'btn_verify\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="submitVerifyCurrentPassword">${__(\'btn_verify\')}</button>'),

    ('<button class="component-button component-button--h40" data-action="submitUpdatePassword">${__(\'btn_save_password\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="submitUpdatePassword">${__(\'btn_save_password\')}</button>'),

    # 3. joinCanvasModal
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_accept\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_accept\')}</button>'),

    # 4. purchaseSuccessModal
    ('<button class="component-button component-button--h45 component-button--pill component-button--wide" data-modal-action="confirm">',
     '<button class="component-button component-button--primary component-button--h45 component-button--pill component-button--wide" data-modal-action="confirm">'),

    # 5. welcomeUserModal
    ('<button class="component-button component-button--h40" data-step-target="welcome-step-2">',
     '<button class="component-button component-button--primary component-button--h40" data-step-target="welcome-step-2">'),
    ('<button class="component-button component-button--h40" data-step-target="welcome-step-3">',
     '<button class="component-button component-button--primary component-button--h40" data-step-target="welcome-step-3">'),
    ('<button class="component-button component-button--h40" data-modal-action="finish">\n                                ${window.__(\'welcome_modal_btn_finish\')}',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="finish">\n                                ${window.__(\'welcome_modal_btn_finish\')}'),

    # 6. onboardingTourModal
    ('<button class="component-button component-button--h40" data-step-target="${modalId}-step-${stepNum + 1}">',
     '<button class="component-button component-button--primary component-button--h40" data-step-target="${modalId}-step-${stepNum + 1}">'),
    ('<button class="component-button component-button--h40" data-modal-action="finish">\n                                ${window.__(\'onboarding_btn_finish\')',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="finish">\n                                ${window.__(\'onboarding_btn_finish\')}'),

    # 7. activate2FADialog
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_activate\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_activate\')}</button>'),

    # 8. verifyEmailCode
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_verify\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_verify\')}</button>'),

    # 9. roleForm
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __(\'btn_save\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${data.confirmKey ? __(data.confirmKey) : __(\'btn_save\')}</button>'),

    # 10. editRolePermissions
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_save_permissions\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_save_permissions\')}</button>'),

    # 11. verifyPasswordDialog
    ("const confirmClass = data.confirmClass || '';",
     "const confirmClass = data.confirmClass || 'component-button--primary';"),

    # 12. warning
    ('<button class="component-button component-button--h40 ${data.dangerBtn ? \'component-button--danger\' : \'\'}" data-modal-action="confirm">',
     '<button class="component-button component-button--h40 ${data.dangerBtn ? \'component-button--danger\' : \'component-button--primary\'}" data-modal-action="confirm">'),

    # 13. promptChangeRole
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_save\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_save\')}</button>'),

    # 14. confirmCreateCanvas
    ("confirmKey: 'btn_create_canvas'\n        })",
     "confirmClass: 'component-button--primary',\n            confirmKey: 'btn_create_canvas'\n        })"),

    # 15. dynamicFormDialog
    ('<button class="component-button component-button--h40" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : (data.confirmText || __(\'btn_accept\'))}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm_dynamic_form">${data.confirmKey ? __(data.confirmKey) : (data.confirmText || __(\'btn_accept\'))}</button>'),

    # 16. liveShareModal / submitJoinLive
    ('<button class="component-button component-button--h40" data-action="submitJoinLive">${__(\'btn_join\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="submitJoinLive">${__(\'btn_join\')}</button>'),
    ('<button class="component-button component-button--h40 ${data.isActive ? \'disabled\' : \'active\'}" data-action="startLive">${__(\'btn_start_live\')}</button>',
     '<button class="component-button component-button--primary component-button--h40 ${data.isActive ? \'disabled\' : \'active\'}" data-action="startLive">${__(\'btn_start_live\')}</button>'),

    # 17. joinCanvasTerms
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${window.__(\'btn_accept\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${window.__(\'btn_accept\')}</button>'),

    # 18. confirmUnlinkGoogleModal
    ('<button type="button" class="component-button component-button--h40" data-modal-action="confirm">${window.__(\'btn_disconnect\')}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${window.__(\'btn_disconnect\')}</button>'),

    # 19. confirmUpgradeModal
    ('<button type="button" class="component-button component-button--h40" data-modal-action="confirm">${btnConfirm}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${btnConfirm}</button>'),

    # 20. confirmPasswordModal
    ('<button type="button" class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_confirm\')}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_confirm\')}</button>'),

    # 21. manageSanctionModal
    ('<button type="button" class="component-button component-button--h40" data-modal-action="confirm" data-ref="btn-sanction-confirm">${__(\'lbl_save_changes\')}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40" data-modal-action="confirm" data-ref="btn-sanction-confirm">${__(\'lbl_save_changes\')}</button>'),
    ('<button type="button" class="component-button component-button--h40 disabled" data-action="sanctionConfirmDate" data-ref="btn-sanction-accept">${__(\'btn_accept\')}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40 disabled" data-action="sanctionConfirmDate" data-ref="btn-sanction-accept">${__(\'btn_accept\')}</button>'),

    # 22. confirmStartBroadcast
    ('<button class="component-button component-button--h40" data-modal-action="confirm">${__(\'btn_start_broadcast\', [])}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-modal-action="confirm">${__(\'btn_start_broadcast\', [])}</button>'),

    # 23. calendarModal
    ('<button type="button" class="component-button component-button--h40 disabled" data-modal-action="confirm" data-ref="btn-calmodal-confirm">${btnConfirm}</button>',
     '<button type="button" class="component-button component-button--primary component-button--h40 disabled" data-modal-action="confirm" data-ref="btn-calmodal-confirm">${btnConfirm}</button>'),

    # 24. changeCanvasRoleModal
    ('<button class="component-button component-button--h40" data-action="saveCanvasMemberRoleSubmit">${__(\'btn_save_changes\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="saveCanvasMemberRoleSubmit">${__(\'btn_save_changes\')}</button>'),

    # 25. timelapseSettingsModal
    ('<button class="component-button component-button--h40" data-action="confirmStartTimelapse">${__(\'lbl_timelapse_start_playback\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="confirmStartTimelapse">${__(\'lbl_timelapse_start_playback\')}</button>'),

    # 26. snapshotDownloadModal
    ('<button class="component-button component-button--h40" data-action="confirmExecuteSnapshotDownload" data-ref="btn-confirm-snapshot-download">',
     '<button class="component-button component-button--primary component-button--h40" data-action="confirmExecuteSnapshotDownload" data-ref="btn-confirm-snapshot-download">'),

    # 27. timelapseExportVideoModal
    ('<button class="component-button component-button--h40" data-action="confirmExportTimelapseVideo" data-ref="btn-confirm-export-video">${__(\'btn_generate_mp4\')}</button>',
     '<button class="component-button component-button--primary component-button--h40" data-action="confirmExportTimelapseVideo" data-ref="btn-confirm-export-video">${__(\'btn_generate_mp4\')}</button>')
]

count = 0
for target, repl in replacements:
    if target in content:
        content = content.replace(target, repl, 1)
        count += 1
    else:
        print(f"Target no encontrado: {target[:60]}...")

with open(modal_file, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nModalTemplates.js actualizado con {count}/{len(replacements)} reemplazos.")
