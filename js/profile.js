/* =====================================================
   GUVI — Profile Page JavaScript
   Interactive profile with confetti, skeleton, ripple, toast progress
   ===================================================== */

$(document).ready(function () {

    // ── Auth Check ──
    const token = localStorage.getItem('guvi_token');
    const email = localStorage.getItem('guvi_email');

    if (!token || !email) {
        window.location.href = 'login.html';
        return;
    }

    // ── Toast Notification (with progress bar) ──
    function showToast(message, type = 'info', duration = 4500) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        const $toast = $('<div class="toast ' + type + '">' +
            '<i class="bi ' + icons[type] + '"></i>' +
            '<span>' + message + '</span>' +
            '<div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>' +
            '</div>');
        $('#toast-container').append($toast);
        setTimeout(function () {
            $toast.addClass('removing');
            setTimeout(function () { $toast.remove(); }, 300);
        }, duration);
    }

    // ── Confetti Burst ──
    function launchConfetti() {
        const colors = ['#00C853', '#2EE66D', '#69F0AE', '#FFC107', '#2196F3', '#FF5252'];
        for (let i = 0; i < 60; i++) {
            const $piece = $('<div class="confetti-piece"></div>').css({
                left: (30 + Math.random() * 40) + '%',
                top: '-10px',
                background: colors[Math.floor(Math.random() * colors.length)],
                width: (Math.random() * 8 + 4) + 'px',
                height: (Math.random() * 8 + 4) + 'px',
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animationDuration: (Math.random() * 1.5 + 1.5) + 's',
                animationDelay: (Math.random() * 0.5) + 's',
                transform: 'rotate(' + (Math.random() * 360) + 'deg)'
            });
            $('body').append($piece);
            setTimeout(function () { $piece.remove(); }, 4000);
        }
    }

    // ── Shake Element ──
    function shake($el) {
        $el.addClass('shake');
        setTimeout(function () { $el.removeClass('shake'); }, 500);
    }

    // ── Ripple on buttons ──
    $(document).on('click', '.btn', function (e) {
        const $btn = $(this);
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const $ripple = $('<span class="ripple"></span>').css({
            width: size + 'px', height: size + 'px',
            left: (e.clientX - rect.left - size / 2) + 'px',
            top: (e.clientY - rect.top - size / 2) + 'px'
        });
        $btn.append($ripple);
        setTimeout(function () { $ripple.remove(); }, 600);
    });

    // ── Focus Pulse ──
    $(document).on('focus', '.form-control', function () {
        $(this).addClass('focus-pulse');
        const $this = $(this);
        setTimeout(function () { $this.removeClass('focus-pulse'); }, 300);
    });

    // ── Skeleton Loading ──
    function showSkeleton() {
        $('.form-control').each(function () {
            $(this).addClass('skeleton').attr('disabled', true);
        });
        $('#avatar').addClass('skeleton').text('');
        $('#displayName').addClass('skeleton').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
        $('#displayEmail').addClass('skeleton').html('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    function hideSkeleton() {
        $('.skeleton').removeClass('skeleton');
        $('.form-control').not('#email').removeAttr('disabled');
    }

    // ── Profile Completion Ring ──
    function updateCompletionRing() {
        const fields = ['#fullName', '#age', '#dob', '#contact', '#address'];
        let filled = 0;
        fields.forEach(function (sel) {
            if ($(sel).val() && $(sel).val().toString().trim()) filled++;
        });
        const pct = Math.round((filled / fields.length) * 100);
        const $ring = $('#completionRing');
        if ($ring.length) {
            const circumference = 2 * Math.PI * 18;
            const offset = circumference - (pct / 100) * circumference;
            $ring.find('.fg').css('stroke-dashoffset', offset);
            $ring.find('.pct').text(pct + '%');
            if (pct >= 80) {
                $ring.find('.fg').css('stroke', 'var(--success)');
            } else if (pct >= 40) {
                $ring.find('.fg').css('stroke', 'var(--accent)');
            } else {
                $ring.find('.fg').css('stroke', 'var(--error)');
            }
        }
        // Update last-saved
        const $ts = $('#lastSaved');
        if ($ts.length && $ts.data('time')) {
            $ts.text('Last saved: ' + new Date($ts.data('time')).toLocaleTimeString());
        }
    }

    // ── Avatar Initials Helper ──
    function getInitials(name, email) {
        if (name && name.trim().length > 0) {
            const parts = name.trim().split(/\s+/);
            if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            return parts[0].substring(0, 2).toUpperCase();
        }
        return email ? email[0].toUpperCase() : '?';
    }

    function updateHeader(name, emailAddr) {
        const displayName = (name && name.trim()) ? name.trim() : 'User';
        $('#displayName').text(displayName);
        $('#displayEmail').text(emailAddr || email);
        $('#avatar').text(getInitials(name, emailAddr || email));
    }

    // ── Load Profile ──
    function loadProfile() {
        showSkeleton();
        $.ajax({
            url: 'php/profile.php',
            type: 'GET',
            headers: { 'Authorization': 'Bearer ' + token },
            dataType: 'json',
            success: function (res) {
                hideSkeleton();
                if (res.success && res.profile) {
                    const p = res.profile;
                    $('#email').val(p.email || email);
                    $('#fullName').val(p.full_name || '');
                    $('#age').val(p.age || '');
                    $('#dob').val(p.dob || '');
                    $('#contact').val(p.contact || '');
                    $('#address').val(p.address || '');
                    updateHeader(p.full_name, p.email);
                    // Animate fields in
                    $('.form-group').each(function (i) {
                        const $fg = $(this);
                        setTimeout(function () {
                            $fg.css({ opacity: 0, transform: 'translateY(12px)' })
                               .animate({ opacity: 1 }, 300)
                               .css('transform', 'translateY(0)');
                        }, i * 80);
                    });
                } else {
                    $('#email').val(email);
                    updateHeader('', email);
                }
                updateCompletionRing();
            },
            error: function (xhr) {
                hideSkeleton();
                if (xhr.status === 401) {
                    showToast('Session expired. Redirecting to login...', 'warning');
                    localStorage.clear();
                    setTimeout(function () { window.location.href = 'login.html'; }, 1500);
                } else {
                    showToast('Failed to load profile.', 'error');
                    $('#email').val(email);
                    updateHeader('', email);
                }
            }
        });
    }

    // Watch fields for completion ring
    $(document).on('input change', '.form-control', function () {
        updateCompletionRing();
    });

    // ── Save Profile ──
    $('#profileForm').on('submit', function (e) {
        e.preventDefault();

        const profileData = {
            full_name: $('#fullName').val().trim(),
            age: $('#age').val() ? parseInt($('#age').val()) : null,
            dob: $('#dob').val() || null,
            contact: $('#contact').val().trim() || null,
            address: $('#address').val().trim() || null
        };

        // Set loading state
        const $btn = $('#saveBtn');
        $btn.addClass('btn-loading');
        $btn.find('.spinner').show();

        $.ajax({
            url: 'php/profile.php',
            type: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            contentType: 'application/json',
            data: JSON.stringify(profileData),
            dataType: 'json',
            success: function (res) {
                if (res.success) {
                    launchConfetti();
                    showToast('Profile updated successfully!', 'success');
                    updateHeader(profileData.full_name, email);
                    updateCompletionRing();
                    // Pulse the save button green
                    $btn.css({ boxShadow: '0 0 20px rgba(0,200,83,.6)', transform: 'scale(1.05)' });
                    setTimeout(function () { $btn.css({ boxShadow: '', transform: '' }); }, 600);
                    // Update timestamp
                    const $ts = $('#lastSaved');
                    if ($ts.length) {
                        $ts.data('time', Date.now());
                        $ts.text('Last saved: ' + new Date().toLocaleTimeString());
                    }
                } else {
                    showToast(res.message || 'Update failed.', 'error');
                    shake($('#profileForm'));
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    showToast('Session expired. Please log in again.', 'warning');
                    localStorage.clear();
                    setTimeout(function () { window.location.href = 'login.html'; }, 1500);
                } else {
                    let msg = 'Failed to update profile.';
                    try {
                        const res = JSON.parse(xhr.responseText);
                        if (res.message) msg = res.message;
                    } catch (e) {}
                    showToast(msg, 'error');
                    shake($('#profileForm'));
                }
            },
            complete: function () {
                $btn.removeClass('btn-loading');
                $btn.find('.spinner').hide();
            }
        });
    });

    // ── Logout ──
    function doLogout() {
        $.ajax({
            url: 'php/profile.php',
            type: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token },
            contentType: 'application/json',
            dataType: 'json',
            complete: function () {
                localStorage.removeItem('guvi_token');
                localStorage.removeItem('guvi_email');
                localStorage.removeItem('guvi_user_id');
                showToast('Logged out successfully.', 'info');
                setTimeout(function () { window.location.href = 'login.html'; }, 1000);
            }
        });
    }

    $('#logoutBtn').click(doLogout);
    $('#navLogout').click(function (e) {
        e.preventDefault();
        doLogout();
    });

    // ── Mobile Nav Toggle ──
    $('#navToggle').click(function () {
        $('#navLinks').toggleClass('show');
    });

    // ── Initialize ──
    loadProfile();

});
